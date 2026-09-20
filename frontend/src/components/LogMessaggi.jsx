// Console TX/RX dei messaggi che passano dal middleware.
import { useEffect, useRef } from "react";
import { IconPlayerPause, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { useLogMessaggi } from "../hooks/useLogMessaggi.js";

function ora(d) {
  return d.toLocaleTimeString("it-IT", { hour12: false }) +
    "." + String(d.getMilliseconds()).padStart(3, "0");
}

function payload(m) {
  if (m.tipo === "cmd") {
    const p = [m.cmd];
    if (m.attivo !== undefined) p.push(`attivo=${m.attivo}`);
    if (m.modo) p.push(`modo=${m.modo}`);
    return p.join(" ");
  }
  if (m.tipo === "soil_moisture" || m.tipo === "air_temperature") {
    return `${m.valore}${m.unita}`;
  }
  if (m.tipo === "irrigation") {
    return `fase=${m.fase} press=${(m.pressione_bar ?? 0).toFixed(1)}bar`;
  }
  return "";
}

export default function LogMessaggi() {
  const { righe, pausa, setPausa, pulisci } = useLogMessaggi(200);
  const boxRef = useRef(null);
  const autoRef = useRef(true);

  useEffect(() => {
    const el = boxRef.current;
    if (el && autoRef.current) el.scrollTop = el.scrollHeight;
  }, [righe]);

  const onScroll = () => {
    const el = boxRef.current;
    if (el) autoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <div className="logbox">
      <div className="log-toolbar">
        <span className="log-titolo">Log messaggi · <b>{righe.length}</b> · {pausa ? "in pausa" : "live"}</span>
        <div className="log-cmd">
          <button onClick={() => setPausa(!pausa)}>
            {pausa ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />}
            {pausa ? "Riprendi" : "Pausa"}
          </button>
          <button onClick={pulisci}><IconTrash size={14} /> Pulisci</button>
        </div>
      </div>
      <div className="log-area" ref={boxRef} onScroll={onScroll}>
        {righe.length === 0 && <div className="log-vuoto">In attesa di messaggi…</div>}
        {righe.map((m) => (
          <div key={m._id} className={"log-riga " + m.dir}>
            <span className="log-t">{ora(m._rx)}</span>
            <span className="log-dir">{m.dir.toUpperCase()}</span>
            <span className="log-rk">{m.rk}</span>
            <span className="log-pl">{payload(m)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
