// Chiamate al server Node. Path relativi: in dev ci pensa il proxy Vite.

export async function getMeta() {
  const r = await fetch("/api/meta");
  if (!r.ok) throw new Error("meta: " + r.status);
  return r.json();
}

export async function getCampi() {
  const r = await fetch("/api/campi");
  if (!r.ok) throw new Error("campi: " + r.status);
  return r.json();
}

export async function getTelemetria() {
  const r = await fetch("/api/telemetria");
  if (!r.ok) throw new Error("telemetria: " + r.status);
  return r.json();
}

/** payload: { attivo?, modo? } */
export async function setIrrigazione(campoId, payload) {
  const r = await fetch(`/api/irrigazione/${campoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("irrigazione: " + r.status);
  return r.json();
}

/** SSE delle rilevazioni. Ritorna la funzione per chiudere lo stream. */
export function apriStream(onRilevazione) {
  const es = new EventSource("/api/stream");
  es.addEventListener("rilevazione", (ev) => {
    try {
      onRilevazione(JSON.parse(ev.data));
    } catch {
      /* ignora righe malformate */
    }
  });
  return () => es.close();
}

/** Stesso stream, evento "messaggio": il log TX/RX. */
export function apriMessaggi(onMessaggio) {
  const es = new EventSource("/api/stream");
  es.addEventListener("messaggio", (ev) => {
    try {
      onMessaggio(JSON.parse(ev.data));
    } catch {
      /* ignora righe malformate */
    }
  });
  return () => es.close();
}
