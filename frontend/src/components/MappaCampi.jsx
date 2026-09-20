import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { coloreStato, ETICHETTA_STATO } from "../stato.js";
import IrrigatoriLayer from "./IrrigatoriLayer.jsx";

function popupHtml(props, r) {
  const soil = r?.soil_moisture;
  return (
    `<b>${props.nome}</b><br/>` +
    `${props.coltura} · ${props.area_m2} m²<br/>` +
    (soil ? `Umidità: <b>${soil.valore}%</b> (${ETICHETTA_STATO[r.stato] || r.stato})` : "In attesa dati")
  );
}

// sposta la vista sul campo selezionato
function VolaSuCampo({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const [lon, lat] = feature.properties.centroide;
    map.flyTo([lat, lon], Math.max(map.getZoom(), 20), { duration: 0.6 });
  }, [feature, map]);
  return null;
}

export default function MappaCampi({ meta, campi, rilevazioni, selezionato, onSeleziona }) {
  const geoRef = useRef(null);
  const center = [meta.centro[1], meta.centro[0]];

  const stileFeature = (f, r, isSel) => {
    const colore = r ? coloreStato(r.stato) : f.properties.colore;
    return {
      color: isSel ? "#2f3718" : colore,
      weight: isSel ? 3.5 : 2,
      fillColor: colore,
      fillOpacity: isSel ? 0.6 : 0.42,
    };
  };

  // ricolora i poligoni, aggiorna i popup, evidenzia la selezione
  useEffect(() => {
    const g = geoRef.current;
    if (!g) return;
    g.eachLayer((layer) => {
      const p = layer.feature.properties;
      const r = rilevazioni[p.id];
      layer.setStyle(stileFeature(layer.feature, r, p.id === selezionato));
      layer.setPopupContent(popupHtml(p, r));
      if (p.id === selezionato) layer.bringToFront();
    });
  }, [rilevazioni, selezionato]);

  const onEach = (feature, layer) => {
    layer.bindPopup(popupHtml(feature.properties, null));
    layer.on("click", () => onSeleziona(feature.properties.id));
  };

  const featureSel = campi.features.find((f) => f.properties.id === selezionato);

  return (
    <MapContainer center={center} zoom={meta.zoom_iniziale} className="mappa" zoomControl={false} maxZoom={21}>
      <TileLayer
        url={meta.tile_layer.url}
        attribution={meta.tile_layer.attribution}
        maxNativeZoom={meta.tile_layer.max_zoom}
        maxZoom={21}
      />
      <GeoJSON
        ref={geoRef}
        data={campi}
        style={(f) => stileFeature(f, rilevazioni[f.properties.id], f.properties.id === selezionato)}
        onEachFeature={onEach}
      />
      <IrrigatoriLayer campi={campi} rilevazioni={rilevazioni} onSeleziona={onSeleziona} />
      <VolaSuCampo feature={featureSel} />
    </MapContainer>
  );
}
