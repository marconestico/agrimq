# backend

Due componenti separati:

- `sensor-service/` genera i dati dei sensori e attua i comandi. 
- `server/` espone REST e SSE al frontend e parla con i sensori.

## server

Node 20, Express. Due sorgenti dati con la stessa interfaccia
`{ start, send, stop }`, scelte con la env `DATASOURCE`:

| DATASOURCE | Modulo | Come prende i dati |
|---|---|---|
| `rabbit` | `datasource/rabbitSource.js` | consuma la coda `telemetria`, pubblica i comandi su `amq.topic` |
| altro | `datasource/childProcessSource.js` | lancia `sensori.py` e ne legge lo stdout NDJSON |

### Endpoint

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/api/health` | stato servizio |
| GET | `/api/meta` | centro, bbox, zoom e tile layer della mappa |
| GET | `/api/campi` | GeoJSON dei campi, `?live=1` aggiunge l'ultima rilevazione |
| GET | `/api/rilevazioni` | snapshot di tutti i campi |
| GET | `/api/rilevazioni/:id` | un campo solo |
| GET | `/api/telemetria` | contatori messaggi, rate, uptime |
| POST | `/api/irrigazione/:id` | `{ attivo?, modo? }`, modo `auto` o `manuale` |
| GET | `/api/stream` | SSE, eventi `rilevazione` e `messaggio` |

### Avvio

```bash
cd server
npm install
npm start          # senza broker: avvia anche il child process Python
```

Env in `server/.env.example`: `PORT`, `PYTHON_BIN`, `SENSOR_INTERVAL`.
Con il broker servono invece `DATASOURCE=rabbit` e `RABBITMQ_URL`,
`RABBITMQ_EXCHANGE`, `RABBITMQ_QUEUE`, `RABBITMQ_BINDING` (vedi il compose).

Lo stato sta in memoria (`src/state.js`): ultima rilevazione per campo e
contatori. Non c'è database, al riavvio si riparte da zero.
