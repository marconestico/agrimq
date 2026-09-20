import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { stato } from "./state.js";
import { getMeta, getCampi, getCampiArricchiti } from "./geo.js";
import { createChildProcessSource } from "./datasource/childProcessSource.js";
import { createRabbitSource } from "./datasource/rabbitSource.js";

// DATASOURCE=rabbit -> consumer RabbitMQ, altrimenti child process Python.
// Le due sorgenti espongono la stessa interfaccia { start, send, stop }.
const source =
  process.env.DATASOURCE === "rabbit"
    ? createRabbitSource()
    : createChildProcessSource();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// metadati mappa
app.get("/api/meta", async (_req, res, next) => {
  try {
    res.json(await getMeta());
  } catch (e) {
    next(e);
  }
});

// GeoJSON dei campi; ?live=1 aggiunge l'ultima rilevazione
app.get("/api/campi", async (req, res, next) => {
  try {
    res.json(req.query.live ? await getCampiArricchiti(stato) : await getCampi());
  } catch (e) {
    next(e);
  }
});

app.get("/api/rilevazioni", (_req, res) => res.json(stato.snapshot()));
app.get("/api/rilevazioni/:id", (req, res) => {
  const r = stato.get(req.params.id);
  if (!r) return res.status(404).json({ error: "campo non trovato" });
  res.json(r);
});

// contatori di signaling
app.get("/api/telemetria", (_req, res) => res.json(stato.telemetriaSnapshot()));

// attiva/disattiva l'irrigatore o cambia modo
app.post("/api/irrigazione/:id", (req, res) => {
  const { attivo, modo } = req.body || {};
  if (modo !== undefined && !["auto", "manuale"].includes(modo)) {
    return res.status(400).json({ error: "modo non valido (auto|manuale)" });
  }
  const cmd = { cmd: "set_irrigazione", campo_id: req.params.id };
  if (attivo !== undefined) cmd.attivo = !!attivo;
  if (modo !== undefined) cmd.modo = modo;

  const ok = source.send(cmd);
  if (!ok) return res.status(503).json({ error: "servizio dati non disponibile" });
  stato.logComando(cmd);   // per il log tecnico
  res.json({ ok: true, inviato: cmd });
});

// stream live SSE
app.get("/api/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  for (const r of stato.snapshot()) {
    res.write(`event: rilevazione\ndata: ${JSON.stringify(r)}\n\n`);
  }
  const onRilevazione = (r) =>
    res.write(`event: rilevazione\ndata: ${JSON.stringify(r)}\n\n`);
  const onMessaggio = (m) =>
    res.write(`event: messaggio\ndata: ${JSON.stringify(m)}\n\n`);
  stato.on("rilevazione", onRilevazione);
  stato.on("messaggio", onMessaggio);
  req.on("close", () => {
    stato.off("rilevazione", onRilevazione);
    stato.off("messaggio", onMessaggio);
  });
});

app.use((err, _req, res, _next) => {
  console.error("[server]", err);
  res.status(500).json({ error: err.message });
});

source.start((record) => stato.applica(record));
const server = app.listen(config.port, () => {
  console.log(`[server] API su http://localhost:${config.port}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n[server] ${sig}: chiusura…`);
    source.stop();
    server.close(() => process.exit(0));
  });
}
