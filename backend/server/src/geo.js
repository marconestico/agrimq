import { readFile } from "node:fs/promises";
import { config } from "./config.js";

// i file geo cambiano di rado: si leggono una volta sola
let campiCache = null;
let metaCache = null;

export async function getCampi() {
  if (!campiCache) {
    campiCache = JSON.parse(await readFile(config.campiFile, "utf-8"));
  }
  return campiCache;
}

export async function getMeta() {
  if (!metaCache) {
    metaCache = JSON.parse(await readFile(config.metaFile, "utf-8"));
  }
  return metaCache;
}

/** Come getCampi(), ma con l'ultima rilevazione in properties.rilevazione. */
export async function getCampiArricchiti(state) {
  const fc = await getCampi();
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        rilevazione: state.get(f.properties.id) || null,
      },
    })),
  };
}
