# sensor-service

Sensori e attuatori simulati. Legge i campi da `assets/geo/campi.geojson` e
genera un ciclo di rilevazioni a intervallo fisso.

## Messaggi

| tipo | campi |
|---|---|
| `soil_moisture` | `valore` (%), `stato`: secco <25, ottimale 25-60, saturo >60 |
| `air_temperature` | `valore` (°C) |
| `irrigation` | `attivo`, `fase`, `modo`, `tipo_irrigazione`, `pressione_bar`, `runtime_s` |

```json
{"campo_id":"campo-1","device_id":"s-campo-1-soil","tipo":"soil_moisture","valore":23.5,"unita":"%","stato":"secco","ts":"2026-07-11T14:00:00+00:00"}
```

L'irrigatore passa per tre fasi: `spento`, `avvio` (4 s di latenza) e `attivo`.
Eroga solo da `attivo`. In modo `auto` si accende sotto il 25% di umidità e si
spegne al 45%.

## Trasporti

`SENSOR_TRANSPORT=stdout` (default): NDJSON su stdout, comandi su stdin.

```bash
python sensori.py --interval 3
echo '{"cmd":"set_irrigazione","campo_id":"campo-1","attivo":true,"modo":"manuale"}' | python sensori.py
```

`SENSOR_TRANSPORT=mqtt`: publish su `farm/<campo>/<tipo>`, subscribe su
`farm/+/cmd`. Serve `paho-mqtt` (`requirements.txt`).

```bash
SENSOR_TRANSPORT=mqtt MQTT_HOST=localhost MQTT_USER=agri MQTT_PASS=agri python sensori.py
```

Env: `SENSOR_INTERVAL`, `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`.

Il wrapper MQTT è in `transport_mqtt.py` e ha un autotest:

```bash
python transport_mqtt.py --host localhost --port 1883
```
