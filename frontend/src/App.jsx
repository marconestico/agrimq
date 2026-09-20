import { useEffect, useMemo, useState } from "react";
import { getMeta, getCampi, setIrrigazione } from "./api.js";
import { useRilevazioni } from "./hooks/useRilevazioni.js";
import { calcolaKpi } from "./stato.js";
import Header from "./components/Header.jsx";
import NavRail from "./components/NavRail.jsx";
import VistaRilevazioni from "./views/VistaRilevazioni.jsx";
import VistaTelemetrie from "./views/VistaTelemetrie.jsx";
import VistaTerreni from "./views/VistaTerreni.jsx";

export default function App() {
  const [meta, setMeta] = useState(null);
  const [campi, setCampi] = useState(null);
  const [errore, setErrore] = useState(null);
  const [selezionato, setSelezionato] = useState(null);
  const [vista, setVista] = useState("rilevazioni");
  const rilevazioni = useRilevazioni();

  useEffect(() => {
    Promise.all([getMeta(), getCampi()])
      .then(([m, c]) => { setMeta(m); setCampi(c); })
      .catch((e) => setErrore(e.message));
  }, []);

  const kpi = useMemo(
    () => calcolaKpi(campi, rilevazioni, meta),
    [campi, rilevazioni, meta]
  );

  const connesso = Object.keys(rilevazioni).length > 0;
  const ultimoAggiornamento = useMemo(() => {
    const ts = Object.values(rilevazioni).map((r) => r.ts).filter(Boolean).sort();
    const ultimo = ts[ts.length - 1];
    return ultimo ? new Date(ultimo).toLocaleTimeString("it-IT") : null;
  }, [rilevazioni]);

  const onIrriga = (campoId, payload) => {
    setIrrigazione(campoId, payload).catch((e) => console.error(e));
  };

  if (errore) return <div className="stato-app">Errore: {errore}</div>;
  if (!meta || !campi) return <div className="stato-app">Caricamento…</div>;

  return (
    <div className="app">
      <Header connesso={connesso} ultimoAggiornamento={ultimoAggiornamento} />
      <div className="corpo">
        <NavRail vista={vista} onVista={setVista} />
        <main className="contenuto">
          {vista === "rilevazioni" && (
            <VistaRilevazioni
              meta={meta}
              campi={campi}
              rilevazioni={rilevazioni}
              kpi={kpi}
              selezionato={selezionato}
              onSeleziona={setSelezionato}
              onIrriga={onIrriga}
            />
          )}
          {vista === "telemetrie" && (
            <VistaTelemetrie connesso={connesso} rilevazioni={rilevazioni} />
          )}
          {vista === "terreni" && (
            <VistaTerreni campi={campi} rilevazioni={rilevazioni} onIrriga={onIrriga} />
          )}
        </main>
      </div>
    </div>
  );
}
