# AgriMQ

Prototipo di middleware asincrono per un'azienda agricola. Sensori simulati
pubblicano la telemetria su RabbitMQ via MQTT, un server Node consuma la coda e
una dashboard React mostra i dati e comanda gli irrigatori.

```
sensori (Python) --MQTT--> RabbitMQ --AMQP--> server Node --SSE--> frontend React
                                                    ^
                                        comandi irrigazione (REST -> AMQP)
```

## Cartelle

| Cartella | Contenuto |
|---|---|
| `backend/sensor-service/` | sensori e attuatori simulati, publisher MQTT |
| `backend/server/` | API REST e stream SSE, consumer AMQP |
| `frontend/` | dashboard React + Leaflet |
| `simulazione/` | scenari di prova del broker |
| `config/` | configurazione RabbitMQ e Mosquitto |
| `assets/geo/` | poligoni dei 13 campi in GeoJSON |
| `scripts/` | conversione KML -> GeoJSON |

## Avvio

```bash
docker compose -f docker-compose.broker.yml up -d --build
```

| Servizio | URL |
|---|---|
| Dashboard | http://localhost:8090 |
| API | http://localhost:8000/api/health |
| RabbitMQ management | http://localhost:15672 (agri/agri) |

Scenari di prova:

```bash
docker compose -f docker-compose.broker.yml --profile sim run --rm simulazione
```

Stop: `docker compose -f docker-compose.broker.yml down`.

## Porte

| Porta host | Servizio |
|---|---|
| 8090 | frontend (nginx) |
| 8000 | API Node |
| 5672 | AMQP |
| 15672 | RabbitMQ management |
| 1883 | MQTT su RabbitMQ |
| 1884 / 9101 | Mosquitto edge, TCP e websockets |

