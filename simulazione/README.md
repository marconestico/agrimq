# simulazione

Prova end-to-end del middleware. `scenari.py` è un client AMQP: non parla mai con
i sensori, che restano i produttori reali. Serve a verificare il disaccoppiamento.

## Scenari

| # | Cosa fa | PASS se |
|---|---|---|
| 1 | coda effimera bindata `farm.#`, ascolta 15 s | 13/13 campi e tutti e tre i tipi di messaggio |
| 2 | interroga la management API sulla coda `telemetria` | durable, con DLX `dlx` |
| 3 | pubblica un comando su `farm.<campo>.cmd` e aspetta la conferma | irrigatore attivo e pressione > 0 |
| 4 | coda durevole con consumer fermo per 10 s, poi la svuota | recuperati >= accumulati |

Esito su stdout, uno `PASS`/`FAIL` per scenario e il riepilogo finale
`=== SIMULAZIONE COMPLETATA: 4/4 scenari PASS ===`. Exit code 0 se passano tutti.

## Esecuzione

Con lo stack già in piedi:

```bash
docker compose -f docker-compose.broker.yml --profile sim run --rm simulazione
```

In locale, con il broker e i sensori già attivi:

```bash
pip install -r requirements.txt
python scenari.py
```

Env: `RABBITMQ_HOST` (localhost), `RABBITMQ_PORT` (5672), `RABBITMQ_MGMT_PORT`
(15672), `RABBITMQ_USER` e `RABBITMQ_PASS` (agri/agri), `SIM_CAMPO` (campo-3).

Lo scenario 4 crea la coda `sim.resilienza` e la cancella alla fine. Se lo
interrompi a metà, la coda resta: si elimina dalla management UI.
