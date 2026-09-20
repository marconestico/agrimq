// Comando irrigatore: auto/manuale e attiva/disattiva, con la fase "in avvio".
import { useEffect, useState } from "react";
import { IconDroplet, IconDropletFilled, IconLoader2 } from "@tabler/icons-react";
import { faseIrr } from "./Irrigatore.jsx";

export default function ControlloIrrigatore({ irrigazione, onComando, compatto }) {
  const modo = irrigazione?.modo || "auto";
  const fase = faseIrr(irrigazione);
  const attivo = fase === "attivo";

  // mostra subito l'attesa, finché la telemetria non esce dalla fase "spento"
  const [inviato, setInviato] = useState(false);
  useEffect(() => {
    if (fase !== "spento") setInviato(false);
  }, [fase]);

  const inAvvio = fase === "avvio" || inviato;

  let etichettaBtn, classeBtn = "", azione = null;
  if (inAvvio) {
    etichettaBtn = "In avvio…";
    classeBtn = "avvio";
  } else if (attivo) {
    etichettaBtn = "Disattiva";
    classeBtn = "stop";
    azione = { attivo: false, modo: "manuale" };
  } else {
    etichettaBtn = "Attiva";
    azione = { attivo: true, modo: "manuale" };
  }

  const disabilitato = modo === "auto" || inAvvio;

  const onClick = () => {
    if (!azione) return;
    if (azione.attivo) setInviato(true);
    onComando(azione);
  };

  return (
    <div className={"irrig" + (compatto ? " compatto" : "")}>
      <div className="irrig-stato">
        {attivo ? (
          <IconDropletFilled size={18} color="#2196f3" />
        ) : inAvvio ? (
          <IconLoader2 size={18} color="#e0a02a" className="spin" />
        ) : (
          <IconDroplet size={18} stroke={1.75} color="#9aa0a6" />
        )}
        <span>
          Irrigatore{" "}
          <b>{attivo ? "ATTIVO" : inAvvio ? "in avvio…" : "spento"}</b>
        </span>
      </div>

      <div className="segmento">
        <button
          className={modo === "auto" ? "sel" : ""}
          onClick={() => onComando({ modo: "auto" })}
        >
          Auto
        </button>
        <button
          className={modo === "manuale" ? "sel" : ""}
          onClick={() => onComando({ modo: "manuale" })}
        >
          Manuale
        </button>
      </div>

      <button
        className={"btn-irriga " + classeBtn}
        disabled={disabilitato}
        title={modo === "auto" ? "Passa a Manuale per comandare" : ""}
        onClick={onClick}
      >
        {etichettaBtn}
      </button>
    </div>
  );
}
