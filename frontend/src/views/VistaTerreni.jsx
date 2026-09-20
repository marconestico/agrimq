// Terreni: una scheda per campo, con il comando dell'irrigatore.
import { IconTemperature, IconVectorTriangle, IconRulerMeasure } from "@tabler/icons-react";
import { coloreStato, ETICHETTA_STATO } from "../stato.js";
import ControlloIrrigatore from "../components/ControlloIrrigatore.jsx";
import Irrigatore from "../components/Irrigatore.jsx";
import SensoriIrrigatore from "../components/SensoriIrrigatore.jsx";

function BarraUmidita({ valore }) {
  const v = Math.max(0, Math.min(100, valore ?? 0));
  return (
    <div className="barra">
      <div className="barra-fill" style={{ width: `${v}%` }} />
      <span className="barra-txt">{valore != null ? `${valore}%` : "—"}</span>
    </div>
  );
}

export default function VistaTerreni({ campi, rilevazioni, onIrriga }) {
  const features = campi?.features ?? [];

  return (
    <div className="vista-terreni">
      <div className="terreni-head">
        <h2 className="serif">Terreni &amp; Irrigazione</h2>
        <p>Dettaglio rilevazioni per appezzamento e comando degli irrigatori.</p>
      </div>

      <div className="terreni-grid">
        {features.map((f) => {
          const p = f.properties;
          const r = rilevazioni[p.id];
          const soil = r?.soil_moisture;
          const temp = r?.air_temperature;
          const stato = r?.stato;
          return (
            <div className="tcampo" key={p.id}>
              <div className="tcampo-head">
                <div>
                  <h3>{p.nome}</h3>
                  <span className="tcampo-coltura">{p.coltura}</span>
                </div>
                {stato && (
                  <span className="badge" style={{ background: coloreStato(stato) }}>
                    {ETICHETTA_STATO[stato] || stato}
                  </span>
                )}
              </div>

              <BarraUmidita valore={soil?.valore} />

              <div className="tcampo-dati">
                <span><IconTemperature size={16} stroke={1.75} /> {temp ? `${temp.valore}°C` : "—"}</span>
                <span><IconVectorTriangle size={16} stroke={1.75} /> {p.area_m2} m²</span>
                <span><IconRulerMeasure size={16} stroke={1.75} /> {p.perimetro_m} m</span>
              </div>

              <div className="tcampo-irrig">
                <Irrigatore fase={r?.irrigazione?.fase} attivo={!!r?.irrigazione?.attivo} sm />
                <SensoriIrrigatore irrigazione={r?.irrigazione} />
              </div>

              <ControlloIrrigatore
                irrigazione={r?.irrigazione}
                onComando={(payload) => onIrriga(p.id, payload)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
