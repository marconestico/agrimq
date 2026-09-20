import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { config } from "../config.js";

/**
 * Datasource senza broker: lancia sensori.py come child process e legge il suo
 * stdout NDJSON, una rilevazione per riga. Stessa interfaccia di rabbitSource.js.
 */
export function createChildProcessSource() {
  let child = null;

  function start(onRecord) {
    const { pythonBin, script, intervalSec } = config.sensor;
    // stdin in pipe: è il canale comandi verso i sensori
    child = spawn(pythonBin, [script, "--interval", String(intervalSec)], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      try {
        onRecord(JSON.parse(t));
      } catch {
        console.error("[datasource] riga NDJSON non valida:", t.slice(0, 120));
      }
    });

    // i log di sensori.py arrivano su stderr
    child.stderr.on("data", (b) =>
      process.stderr.write(`[sensori] ${b.toString()}`)
    );
    child.on("exit", (code) =>
      console.warn(`[datasource] servizio sensori terminato (code ${code})`)
    );
    child.on("error", (err) =>
      console.error(`[datasource] impossibile avviare '${pythonBin}':`, err.message)
    );

    console.log(`[datasource] avviato ${pythonBin} ${script} (intervallo ${intervalSec}s)`);
  }

  /** Comando su stdin come riga NDJSON. */
  function send(command) {
    if (child && child.stdin && child.stdin.writable) {
      child.stdin.write(JSON.stringify(command) + "\n");
      return true;
    }
    return false;
  }

  function stop() {
    if (child) {
      child.kill();
      child = null;
    }
  }

  return { start, send, stop };
}
