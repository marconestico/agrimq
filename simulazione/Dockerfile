# Simulatore scenari, client AMQP, gira dentro la rete del compose.
FROM python:3.12-slim

WORKDIR /app
COPY simulazione/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY simulazione/ ./simulazione/

WORKDIR /app/simulazione
# in rete il broker si chiama "rabbitmq"
ENV RABBITMQ_HOST=rabbitmq \
    RABBITMQ_PORT=5672 \
    RABBITMQ_MGMT_PORT=15672 \
    RABBITMQ_USER=agri \
    RABBITMQ_PASS=agri \
    PYTHONUNBUFFERED=1
CMD ["python", "scenari.py"]
