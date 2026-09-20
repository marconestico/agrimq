# assets/geo

Poligoni dei 13 appezzamenti, ricavati dal rilevamento con Google Earth.

| File | Contenuto |
|---|---|
| `rilevamento_campi.kml` | export originale, sorgente |
| `campi.geojson` | FeatureCollection RFC 7946, CRS84 |
| `farm_meta.json` | centro, bbox, zoom, tile layer, totali |

Rigenerazione:

```bash
python scripts/kml_to_geojson.py
```

## properties di ogni Feature

| Campo | Note |
|---|---|
| `id` | url-safe, es. `campo-1`, `uliveto` |
| `nome` | etichetta originale del KML |
| `ordine` | posizione nel dataset |
| `coltura` | `seminativo`, `olivo` o `terrazzamento` |
| `area_m2`, `area_ha` | superficie |
| `perimetro_m` | perimetro |
| `n_vertici` | vertici distinti, il primo è ripetuto in chiusura |
| `centroide` | `[lon, lat]`, posiziona i marker |
| `colore` | tinta della coltura |

`id` è la chiave di tutto il sistema: diventa la zona nei topic MQTT
(`farm/<id>/<tipo>`) e nella routing key AMQP (`farm.<id>.<tipo>`).

Attenzione all'ordine delle coordinate: GeoJSON usa `[lon, lat]`, Leaflet
`[lat, lon]`. Il componente `<GeoJSON>` converte da solo le geometrie, ma il
centro della mappa e i marker vanno invertiti a mano.

La coltura è un'ipotesi, non un dato rilevato: si cambia in `COLTURE` dentro
`scripts/kml_to_geojson.py`. Aree e perimetri sono calcolati con proiezione
equirettangolare locale, accurata a questa scala.
