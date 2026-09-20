// Striscia KPI sopra la mappa.
import { IconPointFilled } from "@tabler/icons-react";
import { COLORE_STATO } from "../stato.js";

function Kpi({ label, valore, unita, accent }) {
  return (
    <div className={"kpi" + (accent ? " accent-gold" : "")}>
      <div className="k-lab">{label}</div>
      <div className="k-val">
        {valore}
        {unita && <small> {unita}</small>}
      </div>
    </div>
  );
}

export default function Dashboard({ kpi }) {
  const { conteggi } = kpi;
  const fmt = (v, d = 0) => (v == null ? "—" : v.toFixed(d));

  return (
    <div className="kpi-strip">
      <Kpi label="Appezzamenti" valore={kpi.nCampi} />
      <Kpi label="Superficie" valore={fmt(kpi.areaHa, 2)} unita="ha" accent />
      <Kpi label="Umidità media" valore={fmt(kpi.umiditaMedia, 1)} unita="%" />
      <Kpi label="Temp. media" valore={fmt(kpi.tempMedia, 1)} unita="°C" />
      <div className="kpi">
        <div className="k-lab">Stato campi</div>
        <div className="k-stati">
          <span style={{ color: COLORE_STATO.secco }}>
            <IconPointFilled size={14} /> {conteggi.secco} secchi
          </span>
          <span style={{ color: COLORE_STATO.ottimale }}>
            <IconPointFilled size={14} /> {conteggi.ottimale} ok
          </span>
          <span style={{ color: COLORE_STATO.saturo }}>
            <IconPointFilled size={14} /> {conteggi.saturo} saturi
          </span>
        </div>
      </div>
    </div>
  );
}
