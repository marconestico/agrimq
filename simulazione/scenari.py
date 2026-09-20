#!/usr/bin/env python3
"""
Scenari di prova del middleware: pub/sub, coda durevole, comando all'attuatore
e tenuta con il consumer offline.

Gira come client AMQP (pika) e non parla mai con i sensori: è il punto.
I produttori sono i sensori in modalità MQTT, l'hub è RabbitMQ.

    python scenari.py            # localhost, agri/agri
Env: RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_MGMT_PORT, RABBITMQ_USER,
RABBITMQ_PASS, SIM_CAMPO.
"""
from __future__ import annotations
import json
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pika
import requests

HOST = os.getenv("RABBITMQ_HOST", "localhost")
PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
MGMT = int(os.getenv("RABBITMQ_MGMT_PORT", "15672"))
USER = os.getenv("RABBITMQ_USER", "agri")
PASS = os.getenv("RABBITMQ_PASS", "agri")
EXCHANGE = "amq.topic"
CAMPO_CMD = os.getenv("SIM_CAMPO", "campo-3")

OUT_DIR = Path(__file__).resolve().parent / "output"
righe_report: list[str] = []
esiti: list[tuple[str, bool, str]] = []


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)
    righe_report.append(msg)


def connetti() -> pika.BlockingConnection:
    par = pika.ConnectionParameters(
        host=HOST, port=PORT,
        credentials=pika.PlainCredentials(USER, PASS),
        heartbeat=30, blocked_connection_timeout=30,
    )
    return pika.BlockingConnection(par)


def mgmt_queue(nome: str) -> dict:
    """Statistiche di una coda dalla management API."""
    url = f"http://{HOST}:{MGMT}/api/queues/%2F/{nome}"
    r = requests.get(url, auth=(USER, PASS), timeout=5)
    r.raise_for_status()
    return r.json()


def consuma_per(channel, queue, secondi, on_msg):
    """Consuma per `secondi`, on_msg(record) a ogni messaggio."""
    deadline = time.time() + secondi
    for method, _props, body in channel.consume(queue, inactivity_timeout=1):
        if method is None:
            if time.time() >= deadline:
                break
            continue
        try:
            on_msg(json.loads(body.decode("utf-8")))
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        channel.basic_ack(method.delivery_tag)
        if time.time() >= deadline:
            break
    channel.cancel()


# 1. condizioni normali: pub/sub e disaccoppiamento
def scenario_1_normale(conn):
    log("\n## Scenario 1 — Condizioni normali (disaccoppiamento + pub/sub)")
    ch = conn.channel()
    # coda esclusiva bindata a farm.#: riceve una copia dei messaggi senza
    # sottrarre nulla alla coda di lavoro del backend
    q = ch.queue_declare("", exclusive=True).method.queue
    ch.queue_bind(q, EXCHANGE, "farm.#")
    log(f"Sottoscrittore pub/sub creato (queue effimera '{q}' bindata 'farm.#').")

    tipi = Counter()
    campi = set()
    per_campo_tipi = defaultdict(set)
    tot = 0

    def on_msg(rec):
        nonlocal tot
        tot += 1
        cid = rec.get("campo_id")
        tp = rec.get("tipo")
        if cid:
            campi.add(cid)
        if tp:
            tipi[tp] += 1
            if cid:
                per_campo_tipi[cid].add(tp)

    durata = 15
    log(f"Osservazione del flusso per {durata}s…")
    consuma_per(ch, q, durata, on_msg)
    ch.close()

    rate = tot / durata
    log(f"Messaggi ricevuti: **{tot}** ({rate:.1f} msg/s)")
    log(f"Campi distinti osservati: **{len(campi)}**/13")
    log(f"Tipi di messaggio: {dict(tipi)}")
    ok = len(campi) >= 13 and {"soil_moisture", "air_temperature", "irrigation"} <= set(tipi)
    esiti.append(("1 · Condizioni normali (pub/sub)", ok,
                  f"{tot} msg, {len(campi)}/13 campi, tipi={sorted(tipi)}"))
    log(f"Esito: {'PASS' if ok else 'FAIL'}")


# 2. la coda di lavoro 'telemetria' è durevole
def scenario_2_coda(_conn):
    log("\n## Scenario 2 — Coda di lavoro durevole")
    time.sleep(3)  # tempo di accumulare qualche messaggio
    info = mgmt_queue("telemetria")
    durable = info.get("durable")
    msgs = info.get("messages", 0)
    consumers = info.get("consumers", 0)
    dlx = info.get("arguments", {}).get("x-dead-letter-exchange")
    log(f"Coda 'telemetria': durable={durable}, messaggi in coda={msgs}, consumer={consumers}")
    log(f"Dead-letter exchange configurato: {dlx}")
    ok = bool(durable) and msgs >= 0 and dlx == "dlx"
    esiti.append(("2 · Coda durevole 'telemetria'", ok,
                  f"durable={durable}, msgs={msgs}, DLX={dlx}"))
    log(f"Esito: {'PASS' if ok else 'FAIL'}")


# 3. comando all'attuatore e conferma dalla telemetria
def scenario_3_comando(conn):
    log(f"\n## Scenario 3 — Comando asincrono all'attuatore ({CAMPO_CMD})")
    ch = conn.channel()
    q = ch.queue_declare("", exclusive=True).method.queue
    ch.queue_bind(q, EXCHANGE, f"farm.{CAMPO_CMD}.#")

    # il comando passa dal middleware: AMQP -> amq.topic -> plugin mqtt ->
    # topic farm/<campo>/cmd, dove i sensori sono iscritti
    cmd = {"cmd": "set_irrigazione", "campo_id": CAMPO_CMD, "attivo": True, "modo": "manuale"}
    ch.basic_publish(EXCHANGE, f"farm.{CAMPO_CMD}.cmd",
                     json.dumps(cmd).encode("utf-8"),
                     pika.BasicProperties(content_type="application/json"))
    log(f"Comando inviato via broker (routing key farm.{CAMPO_CMD}.cmd): {cmd}")

    attivato = {"ok": False, "pressione": 0.0, "tipo": None}

    def on_msg(rec):
        if rec.get("tipo") == "irrigation" and rec.get("attivo"):
            attivato["ok"] = True
            attivato["pressione"] = rec.get("pressione_bar", 0)
            attivato["tipo"] = rec.get("tipo_irrigazione")

    log("Attendo la conferma dell'attuazione dalla telemetria (max 12s)…")
    consuma_per(ch, q, 12, on_msg)
    ch.close()

    ok = attivato["ok"] and attivato["pressione"] > 0
    log(f"Irrigatore {CAMPO_CMD}: attivo={attivato['ok']}, "
        f"pressione={attivato['pressione']} bar, tipo={attivato['tipo']}")
    esiti.append((f"3 · Comando attuatore ({CAMPO_CMD})", ok,
                  f"attivo={attivato['ok']}, {attivato['pressione']} bar, {attivato['tipo']}"))
    log(f"Esito: {'PASS' if ok else 'FAIL'}")


# 4. consumer offline: la coda durevole non perde messaggi
def scenario_4_resilienza(conn):
    log("\n## Scenario 4 — Resilienza (consumer offline, nessuna perdita)")
    ch = conn.channel()
    qn = "sim.resilienza"
    ch.queue_declare(qn, durable=True)
    # solo l'umidità, così il conteggio è deterministico
    ch.queue_bind(qn, EXCHANGE, "farm.*.soil_moisture")

    offline = 10
    log(f"Consumer OFFLINE per {offline}s: i messaggi devono accumularsi nella coda durevole…")
    time.sleep(offline)
    depth = mgmt_queue(qn).get("messages", 0)
    log(f"Messaggi accumulati mentre il consumer era offline: **{depth}**")

    # torna online e svuota la coda: non deve mancare niente
    ricevuti = {"n": 0}

    def on_msg(_rec):
        ricevuti["n"] += 1

    log("Consumer ONLINE: drenaggio della coda…")
    consuma_per(ch, qn, 6, on_msg)
    ch.queue_delete(qn)
    ch.close()

    log(f"Messaggi recuperati al riavvio: **{ricevuti['n']}** (accumulati ≥ {depth})")
    ok = depth > 0 and ricevuti["n"] >= depth
    esiti.append(("4 · Resilienza (durable queue)", ok,
                  f"accumulati={depth}, recuperati={ricevuti['n']}"))
    log(f"Esito: {'PASS' if ok else 'FAIL'}")


def main():
    # su Windows il default è cp1252 e il log ha caratteri non-ASCII
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    log(f"# Avvio simulazione — broker {HOST}:{PORT} (mgmt {MGMT})")
    conn = connetti()
    try:
        scenario_1_normale(conn)
        scenario_2_coda(conn)
        scenario_3_comando(conn)
        scenario_4_resilienza(conn)
    finally:
        conn.close()

    n_ok = sum(1 for _, ok, _ in esiti if ok)
    print(f"\n=== SIMULAZIONE COMPLETATA: {n_ok}/{len(esiti)} scenari PASS ===")
    return 0 if n_ok == len(esiti) else 1


if __name__ == "__main__":
    raise SystemExit(main())
