// Irrigatore a 3 stati: spento grigio, avvio ambra pulsante, attivo azzurro con onde.
export default function Irrigatore({ fase, attivo, sm }) {
  const f = faseIrr({ fase, attivo });
  const mod = f === "attivo" ? "" : f === "avvio" ? " avvio" : " spento";
  const cls = "irrigatore" + (sm ? " irrigatore--sm" : "") + mod;
  const label =
    f === "attivo" ? "Irrigatore in funzione"
    : f === "avvio" ? "Irrigatore in avvio"
    : "Irrigatore spento";
  return (
    <div className={cls} role="img" aria-label={label}>
      <span className="irrigatore__onda irrigatore__onda--1" />
      <span className="irrigatore__onda irrigatore__onda--2" />
      <span className="irrigatore__onda irrigatore__onda--3" />
      <span className="irrigatore__punto" />
    </div>
  );
}

/** Fase spento|avvio|attivo, con fallback sul vecchio flag attivo. */
export function faseIrr(irrigazione) {
  if (!irrigazione) return "spento";
  return irrigazione.fase || (irrigazione.attivo ? "attivo" : "spento");
}

/** secondi -> mm:ss */
export function formataDurata(sec) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
