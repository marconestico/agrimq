import { useEffect, useRef, useState } from "react";
import { apriMessaggi } from "../api.js";

/** Tiene gli ultimi `max` messaggi TX/RX, con pausa e pulizia. */
export function useLogMessaggi(max = 200) {
  const [righe, setRighe] = useState([]);
  const [pausa, setPausa] = useState(false);
  const pausaRef = useRef(false);
  const seqRef = useRef(0);

  useEffect(() => {
    pausaRef.current = pausa;
  }, [pausa]);

  useEffect(() => {
    const chiudi = apriMessaggi((m) => {
      if (pausaRef.current) return;
      const riga = { ...m, _id: ++seqRef.current, _rx: new Date() };
      setRighe((prev) => {
        const next = prev.length >= max ? prev.slice(prev.length - max + 1) : prev.slice();
        next.push(riga);
        return next;
      });
    });
    return chiudi;
  }, [max]);

  return { righe, pausa, setPausa, pulisci: () => setRighe([]) };
}
