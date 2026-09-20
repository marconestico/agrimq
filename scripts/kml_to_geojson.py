#!/usr/bin/env python3
"""
KML di Google Earth -> GeoJSON dei campi.

Produce campi.geojson (FeatureCollection per Leaflet, WGS84 lon/lat, con area,
perimetro, centroide e coltura per ogni appezzamento) e farm_meta.json
(centro, bbox, zoom, totali).

    python kml_to_geojson.py [input.kml] [output_dir]
Default: ../assets/geo/rilevamento_campi.kml -> ../assets/geo/
"""
from __future__ import annotations
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

R = 6378137.0  # raggio terrestre WGS84, m

# i "CAMPO n" restano seminativo finché non si specifica altro
COLTURE = {
    "ULIVETO": "olivo",
    "TERRAZZAMENTI": "terrazzamento",
}
COLTURA_DEFAULT = "seminativo"

# una tinta per coltura
COLORI = {
    "olivo": "#6b8e23",
    "terrazzamento": "#b8860b",
    "seminativo": "#1976d2",
}


def slugify(name: str) -> str:
    """CAMPO 1 -> campo-1, ULIVETO -> uliveto."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def parse_placemarks(xml: str):
    """(nome, [(lon,lat), ...]) per ogni Placemark con un Polygon."""
    out = []
    for pm in re.findall(r"<Placemark\b.*?</Placemark>", xml, re.S):
        nm = re.search(r"<name>(.*?)</name>", pm, re.S)
        co = re.search(r"<coordinates>(.*?)</coordinates>", pm, re.S)
        if not nm or not co:
            continue
        pts = []
        for tok in co.group(1).split():
            lon, lat, *_ = tok.split(",")
            pts.append((float(lon), float(lat)))
        out.append((nm.group(1).strip(), pts))
    return out


def local_xy(lon, lat, lon0, lat0):
    """Metri rispetto a (lon0,lat0), proiezione equirettangolare."""
    x = math.radians(lon - lon0) * R * math.cos(math.radians(lat0))
    y = math.radians(lat - lat0) * R
    return x, y


def haversine(a, b):
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def polygon_metrics(pts):
    """(area_m2, perimetro_m, centroide_lon, centroide_lat)"""
    lon0 = sum(p[0] for p in pts) / len(pts)
    lat0 = sum(p[1] for p in pts) / len(pts)
    xy = [local_xy(lon, lat, lon0, lat0) for lon, lat in pts]
    # shoelace sulle coordinate proiettate
    area2 = cx = cy = 0.0
    for i in range(len(xy) - 1):
        cross = xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1]
        area2 += cross
        cx += (xy[i][0] + xy[i + 1][0]) * cross
        cy += (xy[i][1] + xy[i + 1][1]) * cross
    area = abs(area2) / 2
    if abs(area2) > 1e-9:
        cx /= (3 * area2)
        cy /= (3 * area2)
    else:
        cx = cy = 0.0
    # centroide da metri a gradi
    clon = lon0 + math.degrees(cx / (R * math.cos(math.radians(lat0))))
    clat = lat0 + math.degrees(cy / R)
    perim = sum(haversine(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return area, perim, clon, clat


def build(input_kml: Path, out_dir: Path):
    xml = input_kml.read_text(encoding="utf-8")
    placemarks = parse_placemarks(xml)

    features = []
    all_lon, all_lat = [], []
    tot_area = 0.0
    for idx, (name, pts) in enumerate(placemarks, start=1):
        area, perim, clon, clat = polygon_metrics(pts)
        tot_area += area
        coltura = COLTURE.get(name.upper(), COLTURA_DEFAULT)
        all_lon += [p[0] for p in pts]
        all_lat += [p[1] for p in pts]
        features.append({
            "type": "Feature",
            "id": slugify(name),
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[round(lon, 8), round(lat, 8)] for lon, lat in pts]],
            },
            "properties": {
                "id": slugify(name),
                "nome": name,
                "ordine": idx,
                "coltura": coltura,
                "area_m2": round(area, 1),
                "area_ha": round(area / 10000, 4),
                "perimetro_m": round(perim, 1),
                "n_vertici": len(pts) - 1,
                "centroide": [round(clon, 8), round(clat, 8)],
                "colore": COLORI.get(coltura, "#1976d2"),
            },
        })

    fc = {
        "type": "FeatureCollection",
        "name": "campi_azienda_agricola",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }

    bbox = [min(all_lon), min(all_lat), max(all_lon), max(all_lat)]
    meta = {
        "nome_dataset": "rilevamento_campi",
        "sorgente": input_kml.name,
        "n_appezzamenti": len(features),
        "area_totale_m2": round(tot_area, 1),
        "area_totale_ha": round(tot_area / 10000, 4),
        "bbox": [round(v, 8) for v in bbox],
        "centro": [round((bbox[0] + bbox[2]) / 2, 8), round((bbox[1] + bbox[3]) / 2, 8)],
        "zoom_iniziale": 19,
        "tile_layer": {
            "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "attribution": "&copy; OpenStreetMap contributors",
            "max_zoom": 19,
        },
        "colture": sorted({f["properties"]["coltura"] for f in features}),
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "campi.geojson").write_text(
        json.dumps(fc, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "farm_meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return fc, meta


def main():
    here = Path(__file__).resolve().parent
    input_kml = Path(sys.argv[1]) if len(sys.argv) > 1 else here.parent / "assets" / "geo" / "rilevamento_campi.kml"
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else here.parent / "assets" / "geo"
    fc, meta = build(input_kml, out_dir)
    print(f"OK  {meta['n_appezzamenti']} appezzamenti  "
          f"{meta['area_totale_m2']} m2 ({meta['area_totale_ha']} ha)")
    print(f"    centro={meta['centro']}  bbox={meta['bbox']}")
    print(f"    -> {out_dir/'campi.geojson'}")
    print(f"    -> {out_dir/'farm_meta.json'}")


if __name__ == "__main__":
    main()
