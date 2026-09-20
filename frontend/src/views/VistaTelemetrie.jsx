// Telemetrie: contatori del flusso messaggi e log tecnico.
import { useEffect, useState } from "react";
import { getTelemetria } from "../api.js";
import LogMessaggi from "../components/LogMessaggi.jsx";

const ETI_TIPO = {
  soil_moisture: "Umidità suolo",
  air_temperature: "Temperatura",
  irrigation: "Irrigazione",
};

function Card({ label, valore, unita, accent, wide }) {
  return (
    <div className={"tcard" + (accent ? " accent" : "") + (wide ? " wide" : "")}>
      <div className="t-lab">{label}</div>
      <div className="t-val">
        {valore}
        {unita && <small> {unita}</small>}
      </div>
    </div>
  );
}

export default function VistaTelemetrie({ connesso, rilevazioni }) {
  const [t, setT] = useState(null);

  useEffect(() => {
    let vivo = true;
    const tick = () => getTelemetria().then((d) => vivo && setT(d)).catch(() => {});
    tick();
    const id = setInterval(tick, 1000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const upt = t ? `${Math.floor(t.uptimeSec / 60)}m ${t.uptimeSec % 60}s` : "—";
  const ultimo = t?.ultimo ? new Date(t.ultimo).toLocaleTimeString("it-IT") : "—";

  return (
    <div className="vista-telemetrie">
      <div className="tele-head">
        <h2 className="serif">Telemetrie &amp; Signaling</h2>
        <p>Monitoraggio del flusso di messaggi asincroni tra sensori/attuatori e sistema.</p>
      </div>

      <div className="tgrid">
        <div className={"tcard stato " + (connesso ? "ok" : "ko")}>
          <div className="t-lab">Canale dati</div>
          <div className="t-val">{connesso ? "Connesso" : "Offline"}</div>
          <div className="t-sub">stream SSE {connesso ? "attivo" : "in attesa"}</div>
        </div>
        <Card label="Messaggi totali" valore={t?.totale ?? "—"} accent />
        <Card label="Frequenza" valore={t?.rate ?? "—"} unita="msg/s" />
        <Card label="Uptime" valore={upt} />
        <Card label="Campi attivi" valore={t?.campiAttivi ?? "—"} />
        <Card label="Ultimo messaggio" valore={ultimo} wide />
      </div>

      <h3 className="sez">Messaggi per tipo</h3>
      <div className="tgrid">
        {t &&
          Object.entries(t.perTipo).map(([tipo, n]) => (
            <Card key={tipo} label={ETI_TIPO[tipo] || tipo} valore={n} />
          ))}
      </div>

      <h3 className="sez">Log trasmissione / ricezione messaggi</h3>
      <LogMessaggi />

      <p className="nota-broker">
        In questa fase i messaggi provengono dal servizio dati mock. Con l'introduzione del
        message broker (MQTT + RabbitMQ) queste metriche rifletteranno code, throughput e
        stato di consegna reali.
      </p>
    </div>
  );
}
