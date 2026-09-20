// Barra di sinistra, sceglie la sezione.
import { IconMap2, IconBroadcast, IconDroplet } from "@tabler/icons-react";

const VOCI = [
  { id: "rilevazioni", Icona: IconMap2, label: "Rilevazioni" },
  { id: "telemetrie", Icona: IconBroadcast, label: "Telemetrie" },
  { id: "terreni", Icona: IconDroplet, label: "Terreni" },
];

export default function NavRail({ vista, onVista }) {
  return (
    <nav className="navrail">
      {VOCI.map(({ id, Icona, label }) => (
        <button
          key={id}
          className={"nav-voce" + (vista === id ? " attiva" : "")}
          onClick={() => onVista(id)}
          title={label}
        >
          <span className="nav-ico">
            <Icona size={26} stroke={1.6} />
          </span>
          <span className="nav-lab">{label}</span>
        </button>
      ))}
    </nav>
  );
}
