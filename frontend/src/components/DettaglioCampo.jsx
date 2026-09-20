// Pannello del campo selezionato da mappa o lista.
import { IconX } from "@tabler/icons-react";
import { coloreStato, ETICHETTA_STATO } from "../stato.js";
import ControlloIrrigatore from "./ControlloIrrigatore.jsx";
import Irrigatore from "./Irrigatore.jsx";
import SensoriIrrigatore from "./SensoriIrrigatore.jsx";

function Cella({ label, valore, full }) {
  return (
    <div className={"cella" + (full ? " full" : "")}>
      <div className="c-lab">{label}</div>
      <div className="c-val">{valore}</div>
    </div>
  );
}

export default function DettaglioCampo({ feature, rilevazione, onChiudi, onIrriga }) {
  if (!feature) return null;
  const p = feature.properties;
  const r = rilevazione;
  const soil = r?.soil_moisture;
  const temp = r?.air_temperature;
  const stato = r?.stato;
  const ora = r?.ts ? new Date(r.ts).toLocaleTimeString("it-IT") : null;

  return (
    <div className="dettaglio">
      <div className="d-head">
        <button className="close" onClick={onChiudi} aria-label="Chiudi"><IconX size={18} stroke={1.75} /></button>
        <h3 className="serif">{p.nome}</h3>
        <div className="d-coltura">Coltura: {p.coltura}</div>
      </div>
      <div className="d-body">
        {stato && (
          <div className="stato-big" style={{ background: coloreStato(stato) }}>
            ● {ETICHETTA_STATO[stato] || stato}
          </div>
        )}
        <div className="grid-dati">
          <Cella label="Umidità suolo" valore={soil ? `${soil.valore}%` : "—"} />
          <Cella label="Temperatura" valore={temp ? `${temp.valore}°C` : "—"} />
          <Cella label="Superficie" valore={`${p.area_m2} m²`} />
          <Cella label="Perimetro" valore={`${p.perimetro_m} m`} />
          <Cella label="Area" valore={`${p.area_ha} ha`} />
          <Cella label="Vertici" valore={p.n_vertici} />
        </div>
        <div className="d-irrig">
          <div className="tcampo-irrig">
            <Irrigatore fase={r?.irrigazione?.fase} attivo={!!r?.irrigazione?.attivo} sm />
            <SensoriIrrigatore irrigazione={r?.irrigazione} />
          </div>
          <ControlloIrrigatore irrigazione={r?.irrigazione} onComando={onIrriga} compatto />
        </div>
        {ora && <div className="d-ts">Ultimo aggiornamento: {ora}</div>}
      </div>
    </div>
  );
}
