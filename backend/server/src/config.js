import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// da backend/server/src tre livelli su = radice del prototipo
const PROTOTIPO_ROOT = resolve(__dirname, "../../../");

export const config = {
  port: Number(process.env.PORT) || 8000,

  // asset geografici, generati da scripts/kml_to_geojson.py
  geoDir: resolve(PROTOTIPO_ROOT, "assets/geo"),
  campiFile: resolve(PROTOTIPO_ROOT, "assets/geo/campi.geojson"),
  metaFile: resolve(PROTOTIPO_ROOT, "assets/geo/farm_meta.json"),

  // usato solo dal datasource child-process
  sensor: {
    pythonBin: process.env.PYTHON_BIN || "python",
    script: resolve(PROTOTIPO_ROOT, "backend/sensor-service/sensori.py"),
    intervalSec: Number(process.env.SENSOR_INTERVAL) || 3,
  },
};
