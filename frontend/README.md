# frontend

Dashboard React + Leaflet. Mappa dei campi su tile OpenStreetMap, valori dei
sensori in tempo reale via SSE e comando degli irrigatori.

Stack: React 18, Vite 5, react-leaflet 4, icone Tabler.

## Avvio

Serve il backend attivo (vedi [../backend/README.md](../backend/README.md)).

```bash
npm install
npm run dev
```

App su http://localhost:5173. Le chiamate `/api/*` le inoltra il proxy di Vite
alla porta 8000. In Docker le serve nginx, che fa da proxy verso il container
`backend`.

## Sezioni

1. Rilevazioni: mappa, lista campi, KPI, pannello di dettaglio.
2. Telemetrie: contatori del flusso messaggi e log TX/RX.
3. Terreni: una scheda per campo con il comando dell'irrigatore.

## Struttura

```
src/
├── App.jsx                   stato globale e cambio vista
├── api.js                    REST + due stream SSE
├── stato.js                  colori degli stati e calcolo KPI
├── hooks/                    useRilevazioni, useLogMessaggi
├── views/                    una per sezione
└── components/               mappa, lista, dashboard, irrigatori
```

I poligoni sono colorati per stato di umidità, grigi finché non arriva la prima
rilevazione. La selezione è condivisa tra mappa e lista. In modo `auto` il
pulsante di comando resta disabilitato: decidono le soglie lato sensori.
