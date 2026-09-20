// Colori ed etichette degli stati campo, da tenere allineati a styles.css.

export const COLORE_STATO = {
  secco: "#c2703a",
  ottimale: "#5c7a33",
  saturo: "#4b7f93",
};
export const COLORE_ND = "#b9b6a7";

export const ETICHETTA_STATO = {
  secco: "Secco",
  ottimale: "Ottimale",
  saturo: "Saturo",
};

export function coloreStato(stato) {
  return COLORE_STATO[stato] || COLORE_ND;
}

/** Numeri della dashboard: conteggi per stato e medie. */
export function calcolaKpi(campi, rilevazioni, meta) {
  const features = campi?.features ?? [];
  const conteggi = { secco: 0, ottimale: 0, saturo: 0, nd: 0 };
  let sommaUmidita = 0, nUmidita = 0, sommaTemp = 0, nTemp = 0;

  for (const f of features) {
    const r = rilevazioni[f.properties.id];
    if (!r) { conteggi.nd++; continue; }
    conteggi[r.stato] = (conteggi[r.stato] || 0) + 1;
    if (r.soil_moisture) { sommaUmidita += r.soil_moisture.valore; nUmidita++; }
    if (r.air_temperature) { sommaTemp += r.air_temperature.valore; nTemp++; }
  }

  return {
    nCampi: features.length,
    areaHa: meta?.area_totale_ha ?? null,
    umiditaMedia: nUmidita ? sommaUmidita / nUmidita : null,
    tempMedia: nTemp ? sommaTemp / nTemp : null,
    conteggi,
  };
}
