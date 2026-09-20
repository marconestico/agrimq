// Un marker irrigatore per campo, sul centroide. Il divIcon riusa il CSS di Irrigatore.jsx.
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { formataDurata, faseIrr } from "./Irrigatore.jsx";

function htmlIcona(fase) {
  const mod = fase === "attivo" ? "" : fase === "avvio" ? "avvio" : "spento";
  return (
    `<div class="irrigatore irrigatore--sm ${mod}">` +
    `<span class="irrigatore__onda irrigatore__onda--1"></span>` +
    `<span class="irrigatore__onda irrigatore__onda--2"></span>` +
    `<span class="irrigatore__onda irrigatore__onda--3"></span>` +
    `<span class="irrigatore__punto"></span></div>`
  );
}

function makeIcon(fase) {
  return L.divIcon({
    html: htmlIcona(fase),
    className: "irrig-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

const TESTO_FASE = { spento: "fermo", avvio: "in avvio…", attivo: "in funzione" };

function tooltip(nome, irr) {
  if (!irr) return `<b>${nome}</b><br/>Irrigatore: —`;
  const fase = faseIrr(irr);
  return (
    `<b>${nome}</b><br/>Irrigatore: <b>${TESTO_FASE[fase]}</b>` +
    (fase === "attivo"
      ? `<br/>${irr.tipo_irrigazione} · ${(irr.pressione_bar ?? 0).toFixed(1)} bar` +
        `<br/>Funzionamento: ${formataDurata(irr.runtime_s)}`
      : "")
  );
}

export default function IrrigatoriLayer({ campi, rilevazioni, onSeleziona }) {
  const map = useMap();
  const markers = useRef({});

  // i marker si creano una volta sola, o se cambiano i campi
  useEffect(() => {
    campi.features.forEach((f) => {
      const [lon, lat] = f.properties.centroide;
      const m = L.marker([lat, lon], { icon: makeIcon("spento"), keyboard: false });
      if (onSeleziona) m.on("click", () => onSeleziona(f.properties.id));
      m.addTo(map);
      markers.current[f.properties.id] = m;
    });
    return () => {
      Object.values(markers.current).forEach((m) => m.remove());
      markers.current = {};
    };
  }, [map, campi]);

  // icona e tooltip si aggiornano a ogni rilevazione
  useEffect(() => {
    campi.features.forEach((f) => {
      const p = f.properties;
      const m = markers.current[p.id];
      if (!m) return;
      const irr = rilevazioni[p.id]?.irrigazione;
      m.setIcon(makeIcon(faseIrr(irr)));
      m.bindTooltip(tooltip(p.nome, irr), { direction: "top", offset: [0, -12] });
    });
  }, [rilevazioni, campi]);

  return null;
}
