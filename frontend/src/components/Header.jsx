// Logo, titolo e spia dello stream.
import { IconWifi, IconWifiOff } from "@tabler/icons-react";

export default function Header({ connesso, ultimoAggiornamento }) {
  return (
    <header className="header">
      <img className="logo" src="/img/logo-wide-light.png" alt="Colle Trugli" />
      <div className="titolo">
        <span className="t1 serif">Monitoraggio Campi</span>
        <span className="t2">Sistema di rilevazione agri-tech · comunicazione asincrona</span>
      </div>
      <div className="spacer" />
      <div className="live" title="Stato flusso dati in tempo reale">
        {connesso ? (
          <IconWifi size={18} stroke={1.75} color="var(--st-ottimale)" />
        ) : (
          <IconWifiOff size={18} stroke={1.75} color="var(--st-nd)" />
        )}
        {connesso ? "Dati in tempo reale" : "In attesa dati"}
        {ultimoAggiornamento && (
          <span style={{ color: "var(--ink-faint)" }}>· {ultimoAggiornamento}</span>
        )}
      </div>
    </header>
  );
}
