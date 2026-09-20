# Server Node (REST/SSE). Include anche Python perché senza broker il server
# lancia sensori.py come child process.
# Build context: cartella del prototipo, come si aspetta config.js.
FROM node:20-slim

# basta la stdlib
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# prima le dipendenze, per la cache del layer
COPY backend/server/package*.json backend/server/
RUN cd backend/server && npm install --omit=dev

# Codice e asset
COPY backend/ backend/
COPY assets/geo/ assets/geo/

ENV PORT=8000 \
    PYTHON_BIN=python3 \
    SENSOR_INTERVAL=3

EXPOSE 8000
CMD ["node", "backend/server/src/index.js"]
