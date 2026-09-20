// Sidebar con ricerca ed elenco campi, selezione condivisa con la mappa.
import { useMemo, useState } from "react";
import { coloreStato } from "../stato.js";

export default function ListaCampi({ campi, rilevazioni, selezionato, onSeleziona }) {
  const [q, setQ] = useState("");
  const features = campi?.features ?? [];

  const filtrati = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return features;
    return features.filter(
      (f) =>
        f.properties.nome.toLowerCase().includes(s) ||
        f.properties.coltura.toLowerCase().includes(s)
    );
  }, [features, q]);

  return (
    <div className="sidebar">
      <div className="cerca">
        <input
          placeholder="Cerca campo o coltura…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="titoletto">{filtrati.length} appezzamenti</div>
      <ul className="lista">
        {filtrati.map((f) => {
          const p = f.properties;
          const r = rilevazioni[p.id];
          const soil = r?.soil_moisture;
          return (
            <li
              key={p.id}
              className={selezionato === p.id ? "sel" : ""}
              onClick={() => onSeleziona(p.id)}
            >
              <span
                className="pallino"
                style={{ background: coloreStato(r?.stato) }}
              />
              <span>
                <div className="nome">{p.nome}</div>
                <div className="meta">{p.coltura} · {p.area_m2} m²</div>
              </span>
              {soil ? (
                <span className="valore">{soil.valore}%</span>
              ) : (
                <span className="valore nd">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
