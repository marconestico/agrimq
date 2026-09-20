import { EventEmitter } from "node:events";

/**
 * Stato in memoria: ultima rilevazione per campo, irrigatori, contatori
 * di telemetria. Fa anche da bus eventi per l'SSE.
 */
class Stato extends EventEmitter {
  constructor() {
    super();
    this.perCampo = new Map();
    this.telemetria = {
      totale: 0,
      perTipo: {},
      avvio: new Date().toISOString(),
      ultimo: null,
    };
  }

  /** Aggiorna lo stato con un record in arrivo dai sensori. */
  applica(record) {
    const { campo_id, tipo } = record;
    if (!campo_id || !tipo) return;

    this.telemetria.totale++;
    this.telemetria.perTipo[tipo] = (this.telemetria.perTipo[tipo] || 0) + 1;
    this.telemetria.ultimo = record.ts || this.telemetria.ultimo;

    const corrente = this.perCampo.get(campo_id) || { campo_id };
    if (tipo === "irrigation") {
      corrente.irrigazione = {
        attivo: !!record.attivo,
        fase: record.fase || (record.attivo ? "attivo" : "spento"),
        modo: record.modo,
        tipo_irrigazione: record.tipo_irrigazione,
        pressione_bar: record.pressione_bar,
        runtime_s: record.runtime_s,
      };
    } else {
      corrente[tipo] = {
        valore: record.valore,
        unita: record.unita,
        device_id: record.device_id,
      };
      if (tipo === "soil_moisture") corrente.stato = record.stato;
    }
    corrente.ts = record.ts;
    this.perCampo.set(campo_id, corrente);
    this.emit("rilevazione", corrente);

    // versione compatta per il log tecnico
    this.emit("messaggio", {
      dir: "rx",
      ts: record.ts,
      campo_id,
      tipo,
      device_id: record.device_id,
      rk: `farm.${campo_id}.${tipo}`,
      valore: record.valore,
      unita: record.unita,
      fase: record.fase,
      pressione_bar: record.pressione_bar,
    });
  }

  /** Segna nel log l'invio di un comando. */
  logComando(cmd) {
    this.emit("messaggio", {
      dir: "tx",
      ts: new Date().toISOString(),
      campo_id: cmd.campo_id,
      tipo: "cmd",
      rk: `farm.${cmd.campo_id}.cmd`,
      cmd: cmd.cmd,
      attivo: cmd.attivo,
      modo: cmd.modo,
    });
  }

  get(campoId) {
    return this.perCampo.get(campoId) || null;
  }

  snapshot() {
    return Array.from(this.perCampo.values());
  }

  telemetriaSnapshot() {
    const uptimeSec = Math.max(
      1,
      (Date.now() - new Date(this.telemetria.avvio).getTime()) / 1000
    );
    return {
      totale: this.telemetria.totale,
      perTipo: this.telemetria.perTipo,
      ultimo: this.telemetria.ultimo,
      avvio: this.telemetria.avvio,
      uptimeSec: Math.round(uptimeSec),
      rate: +(this.telemetria.totale / uptimeSec).toFixed(2),
      campiAttivi: this.perCampo.size,
    };
  }
}

export const stato = new Stato();
