#!/usr/bin/env python3
"""
Sensori e attuatori mock. Genera i dati, niente HTTP.

Messaggi emessi: soil_moisture (%), air_temperature (C), irrigation (stato attuatore).
Uscita: NDJSON su stdout, oppure publish MQTT se SENSOR_TRANSPORT=mqtt.
Comandi in ingresso (stdin o topic MQTT), uno per riga:
  {"cmd":"set_irrigazione","campo_id":"campo-1","attivo":true,"modo":"manuale"}
"""
from __future__ import annotations
import argparse
import json
import math
import os
import random
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

# Soglie umidità suolo (%)
SOGLIA_SECCO = 25.0
SOGLIA_SATURO = 60.0
SOGLIA_STOP_IRRIG = 45.0   # in auto l'irrigatore si spegne qui
RICARICA_IRRIG = 3.2       # umidità recuperata per ciclo con irrigatore attivo
RITARDO_AVVIO = 4.0        # latenza attuatore, secondi

BASELINE_UMIDITA = {"olivo": 22.0, "terrazzamento": 30.0, "seminativo": 35.0}

# tipo di irrigazione per coltura + pressione tipica (bar)
TIPO_IRRIGAZIONE = {"olivo": "a goccia", "terrazzamento": "microaspersione", "seminativo": "aspersione"}
PRESSIONE_BASE = {"a goccia": 1.2, "microaspersione": 2.0, "aspersione": 2.8}

# condiviso tra loop dati e thread comandi
_lock = threading.Lock()
irrigatori: dict[str, dict] = {}   # campo_id -> {"modo","richiesto","fase","avvio_ts"}

_mqtt = None   # None = stdout/stdin, istanza TrasportoMQTT = broker


def carica_campi(geojson_path: Path):
    fc = json.loads(Path(geojson_path).read_text(encoding="utf-8"))
    return [(f["properties"]["id"], f["properties"].get("coltura", "seminativo"))
            for f in fc["features"]]


def stato_umidita(v: float) -> str:
    if v < SOGLIA_SECCO:
        return "secco"
    if v > SOGLIA_SATURO:
        return "saturo"
    return "ottimale"


def emit(record: dict):
    """Publish MQTT se il trasporto è attivo, altrimenti NDJSON su stdout."""
    if _mqtt is not None:
        campo = record["campo_id"]
        tipo = record.get("tipo", "irrigation")
        _mqtt.publish(f"farm/{campo}/{tipo}", record)
        return
    try:
        sys.stdout.write(json.dumps(record, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        raise SystemExit(0)


def _applica_comando(cmd: dict):
    """Applica un comando irrigazione, da stdin o da MQTT."""
    if cmd.get("cmd") != "set_irrigazione":
        return
    cid = cmd.get("campo_id")
    with _lock:
        st = irrigatori.get(cid)
        if st is None:
            return
        if cmd.get("modo") in ("auto", "manuale"):
            st["modo"] = cmd["modo"]
        if "attivo" in cmd:
            # è una richiesta: l'accensione vera passa dalla fase "avvio"
            st["richiesto"] = bool(cmd["attivo"])
    print(f"[sensori] comando irrigazione {cid} -> {irrigatori.get(cid)}",
          file=sys.stderr, flush=True)


def leggi_comandi():
    """Thread che legge i comandi JSON da stdin, uno per riga."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            _applica_comando(json.loads(line))
        except json.JSONDecodeError:
            continue


def genera(campi, interval: float):
    umidita = {cid: BASELINE_UMIDITA.get(col, 35.0) for cid, col in campi}
    tipo_per_campo = {cid: TIPO_IRRIGAZIONE.get(col, "aspersione") for cid, col in campi}
    attivo_da = {cid: None for cid, _ in campi}   # ts accensione, None se spento
    with _lock:
        for cid, _ in campi:
            irrigatori[cid] = {"modo": "auto", "richiesto": False, "fase": "spento", "avvio_ts": None}

    t0 = time.time()
    while True:
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        minuti = (time.time() - t0) / 60.0
        temp_base = 24.0 + 6.0 * math.sin(minuti / 30.0)

        for cid, col in campi:
            base = BASELINE_UMIDITA.get(col, 35.0)
            with _lock:
                irr = irrigatori[cid]
                if irr["modo"] == "auto":
                    if umidita[cid] < SOGLIA_SECCO:
                        irr["richiesto"] = True
                    elif umidita[cid] >= SOGLIA_STOP_IRRIG:
                        irr["richiesto"] = False
                # spento -> avvio (RITARDO_AVVIO) -> attivo
                if irr["richiesto"]:
                    if irr["fase"] == "spento":
                        irr["fase"] = "avvio"
                        irr["avvio_ts"] = time.time()
                    elif irr["fase"] == "avvio" and time.time() - irr["avvio_ts"] >= RITARDO_AVVIO:
                        irr["fase"] = "attivo"
                else:
                    irr["fase"] = "spento"
                    irr["avvio_ts"] = None
                fase, modo = irr["fase"], irr["modo"]
            attivo = fase == "attivo"   # durante l'avvio non eroga

            # evapotraspirazione + rientro al baseline + eventuale ricarica
            umidita[cid] += random.uniform(-1.2, 0.4) + (base - umidita[cid]) * 0.05
            if attivo:
                umidita[cid] += RICARICA_IRRIG
            umidita[cid] = max(5.0, min(90.0, umidita[cid]))
            val = round(umidita[cid], 1)

            # sensori irrigatore: runtime, pressione, tipo
            if attivo and attivo_da[cid] is None:
                attivo_da[cid] = time.time()
            elif not attivo:
                attivo_da[cid] = None
            runtime_s = int(time.time() - attivo_da[cid]) if attivo_da[cid] else 0
            tipo_ir = tipo_per_campo[cid]
            pressione = round(PRESSIONE_BASE.get(tipo_ir, 2.5) + random.uniform(-0.2, 0.2), 2) if attivo else 0.0

            emit({"campo_id": cid, "device_id": f"s-{cid}-soil", "tipo": "soil_moisture",
                  "valore": val, "unita": "%", "stato": stato_umidita(val), "ts": now})
            emit({"campo_id": cid, "device_id": f"s-{cid}-temp", "tipo": "air_temperature",
                  "valore": round(temp_base + random.uniform(-0.8, 0.8), 1),
                  "unita": "°C", "stato": "ottimale", "ts": now})
            emit({"campo_id": cid, "device_id": f"a-{cid}-irrig", "tipo": "irrigation",
                  "attivo": attivo, "fase": fase, "modo": modo, "tipo_irrigazione": tipo_ir,
                  "pressione_bar": pressione, "runtime_s": runtime_s, "ts": now})

        time.sleep(interval)


def main():
    for stream in (sys.stdout, sys.stderr, sys.stdin):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    here = Path(__file__).resolve().parent
    default_geo = here.parents[1] / "assets" / "geo" / "campi.geojson"
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=float, default=float(os.getenv("SENSOR_INTERVAL", "1.5")))
    ap.add_argument("--geojson", type=Path, default=default_geo)
    args = ap.parse_args()

    campi = carica_campi(args.geojson)
    trasporto = os.getenv("SENSOR_TRANSPORT", "stdout").lower()
    print(f"[sensori] avviato: {len(campi)} campi, intervallo {args.interval}s, trasporto {trasporto}",
          file=sys.stderr, flush=True)

    if trasporto == "mqtt":
        global _mqtt
        from transport_mqtt import TrasportoMQTT
        _mqtt = TrasportoMQTT(client_id="sensori",
                              username=os.getenv("MQTT_USER"),
                              password=os.getenv("MQTT_PASS"), qos=1)
        _mqtt.connect(os.getenv("MQTT_HOST", "rabbitmq"), int(os.getenv("MQTT_PORT", "1883")))
        _mqtt.subscribe_commands("farm/+/cmd", _applica_comando)
        _mqtt.loop_start()
    else:
        threading.Thread(target=leggi_comandi, daemon=True).start()

    try:
        genera(campi, args.interval)
    except KeyboardInterrupt:
        print("[sensori] arresto", file=sys.stderr, flush=True)
    finally:
        if _mqtt is not None:
            _mqtt.loop_stop()
            _mqtt.disconnect()


if __name__ == "__main__":
    main()
