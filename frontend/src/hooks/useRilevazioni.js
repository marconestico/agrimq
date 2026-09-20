import { useEffect, useState } from "react";
import { apriStream } from "../api.js";

/** Mappa { campo_id -> rilevazione } tenuta aggiornata dallo stream SSE. */
export function useRilevazioni() {
  const [perCampo, setPerCampo] = useState({});

  useEffect(() => {
    const chiudi = apriStream((r) => {
      setPerCampo((prev) => ({ ...prev, [r.campo_id]: r }));
    });
    return chiudi;
  }, []);

  return perCampo;
}
