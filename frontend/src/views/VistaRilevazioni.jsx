// Rilevazioni: mappa, lista campi, KPI e pannello di dettaglio.
import ListaCampi from "../components/ListaCampi.jsx";
import MappaCampi from "../components/MappaCampi.jsx";
import Dashboard from "../components/Dashboard.jsx";
import DettaglioCampo from "../components/DettaglioCampo.jsx";

export default function VistaRilevazioni({
  meta, campi, rilevazioni, kpi, selezionato, onSeleziona, onIrriga,
}) {
  const featureSel =
    campi.features.find((f) => f.properties.id === selezionato) || null;

  return (
    <div className="vista-rilevazioni">
      <ListaCampi
        campi={campi}
        rilevazioni={rilevazioni}
        selezionato={selezionato}
        onSeleziona={onSeleziona}
      />
      <div className="area">
        <MappaCampi
          meta={meta}
          campi={campi}
          rilevazioni={rilevazioni}
          selezionato={selezionato}
          onSeleziona={onSeleziona}
        />
        <Dashboard kpi={kpi} />
        {featureSel && (
          <DettaglioCampo
            feature={featureSel}
            rilevazione={rilevazioni[selezionato]}
            onChiudi={() => onSeleziona(null)}
            onIrriga={(payload) => onIrriga(selezionato, payload)}
          />
        )}
      </div>
    </div>
  );
}
