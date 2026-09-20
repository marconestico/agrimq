// Lettura sensori irrigatore: stato, runtime, pressione, tipo.
import { IconActivity, IconClock, IconGauge, IconSpray } from "@tabler/icons-react";
import { formataDurata, faseIrr } from "./Irrigatore.jsx";

function Cella({ Icona, lab, val, tono }) {
  return (
    <div className="si-cella">
      <div className="si-lab">
        <Icona size={13} stroke={1.75} /> {lab}
      </div>
      <div className={"si-val" + (tono ? " " + tono : "")}>{val}</div>
    </div>
  );
}

const TESTO_FASE = { spento: "Fermo", avvio: "In avvio…", attivo: "In funzione" };
const TONO_FASE = { spento: "", avvio: "ambra", attivo: "azzurro" };

export default function SensoriIrrigatore({ irrigazione }) {
  const fase = faseIrr(irrigazione);
  return (
    <div className="sens-irrig">
      <Cella Icona={IconActivity} lab="Stato" val={TESTO_FASE[fase]} tono={TONO_FASE[fase]} />
      <Cella Icona={IconClock} lab="Funzionamento" val={formataDurata(irrigazione?.runtime_s)} />
      <Cella
        Icona={IconGauge}
        lab="Pressione"
        val={`${(irrigazione?.pressione_bar ?? 0).toFixed(1)} bar`}
        tono={fase === "attivo" ? "azzurro" : ""}
      />
      <Cella Icona={IconSpray} lab="Tipo" val={irrigazione?.tipo_irrigazione || "—"} />
    </div>
  );
}
