#!/usr/bin/env python3
"""
Wrapper minimale su paho-mqtt usato da sensori.py.

Topic: telemetria su farm/<campo>/<tipo>, comandi su farm/<campo>/cmd
(wildcard farm/+/cmd per tutti i campi). Payload: lo stesso JSON dell'NDJSON.
Destinazione: RabbitMQ con plugin rabbitmq_mqtt sulla 1883; i messaggi finiscono
su amq.topic, dove lo "/" del topic MQTT diventa "." nella routing key.

Autotest: python transport_mqtt.py --host localhost --port 1883
"""
from __future__ import annotations

import json
import sys
import time
from typing import Callable

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None


class TrasportoMQTT:
    """connect / publish / subscribe_commands / loop_start / loop_stop / disconnect."""

    def __init__(
        self,
        client_id: str = "sensori",
        username: str | None = None,
        password: str | None = None,
        qos: int = 1,
        keepalive: int = 30,
    ):
        if mqtt is None:
            raise RuntimeError(
                "paho-mqtt non installato. Esegui: pip install 'paho-mqtt>=2.0' "
                "(vedi backend/sensor-service/requirements.txt)"
            )
        self.qos = qos
        self.keepalive = keepalive
        self._connesso = False
        self._on_comando: Callable[[dict], None] | None = None

        # paho >= 2.0 vuole la callback API v2
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2, client_id=client_id, clean_session=True
        )
        if username:
            self._client.username_pw_set(username, password)

        # riconnessione automatica con backoff
        self._client.reconnect_delay_set(min_delay=1, max_delay=30)

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def connect(self, host: str = "localhost", port: int = 1883):
        """Non blocca: il loop di rete va avviato a parte."""
        self._client.connect(host, port, keepalive=self.keepalive)

    def loop_start(self):
        self._client.loop_start()

    def loop_stop(self):
        self._client.loop_stop()

    def disconnect(self):
        try:
            self._client.disconnect()
        except Exception:
            pass

    def publish(self, topic: str, payload: dict):
        """Record come JSON sul topic. QoS>=1 = consegna almeno una volta."""
        body = json.dumps(payload, ensure_ascii=False)
        return self._client.publish(topic, body, qos=self.qos)

    def subscribe_commands(self, topic: str, callback: Callable[[dict], None]):
        """callback(dict) per ogni comando che arriva sul topic."""
        self._on_comando = callback
        self._client.subscribe(topic, qos=self.qos)

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        self._connesso = (getattr(reason_code, "value", reason_code) == 0)
        print(f"[transport_mqtt] connesso (rc={reason_code})", file=sys.stderr, flush=True)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        self._connesso = False
        print(f"[transport_mqtt] disconnesso (rc={reason_code}), riconnessione automatica…",
              file=sys.stderr, flush=True)

    def _on_message(self, client, userdata, msg):
        if self._on_comando is None:
            return
        try:
            cmd = json.loads(msg.payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            print(f"[transport_mqtt] payload comando non valido su {msg.topic}",
                  file=sys.stderr, flush=True)
            return
        try:
            self._on_comando(cmd)
        except Exception as e:  # un errore nel callback non deve fermare il thread di rete
            print(f"[transport_mqtt] errore nel callback comando: {e}",
                  file=sys.stderr, flush=True)


# publish di prova + subscribe comandi
def _autotest():
    import argparse

    ap = argparse.ArgumentParser(description="Autotest TrasportoMQTT")
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--user", default=None)
    ap.add_argument("--password", default=None)
    args = ap.parse_args()

    if mqtt is None:
        print("paho-mqtt NON installato: 'pip install paho-mqtt>=2.0' per usare il trasporto.")
        return 1

    try:
        t = TrasportoMQTT(client_id="autotest", username=args.user, password=args.password)
        t.connect(args.host, args.port)
        t.subscribe_commands(
            "farm/+/cmd",
            lambda c: print(f"[autotest] comando ricevuto: {c}"),
        )
        t.loop_start()
        record = {
            "campo_id": "campo-test",
            "device_id": "s-test-soil",
            "tipo": "soil_moisture",
            "valore": 42.0,
            "unita": "%",
            "stato": "ottimale",
            "ts": "2026-07-11T00:00:00+00:00",
        }
        t.publish("farm/campo-test/soil_moisture", record)
        print("[autotest] pubblicato record di prova su farm/campo-test/soil_moisture")
        print("[autotest] in ascolto comandi su farm/+/cmd per 5s…")
        time.sleep(5)
        t.loop_stop()
        t.disconnect()
        print("[autotest] OK")
        return 0
    except Exception as e:
        print(f"[autotest] broker non raggiungibile o errore: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(_autotest())
