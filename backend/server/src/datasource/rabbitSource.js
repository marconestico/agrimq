import amqp from "amqplib";

/**
 * Datasource RabbitMQ: consuma la telemetria dalla queue 'telemetria' e pubblica
 * i comandi su amq.topic. Stessa interfaccia di childProcessSource.js.
 *
 * sensori.py --MQTT--> RabbitMQ:1883 --amq.topic--> queue telemetria --> qui.
 * send() pubblica con routing key farm.<campo>.cmd, che il plugin mqtt recapita
 * sul topic farm/<campo>/cmd ("/" MQTT == "." AMQP).
 *
 * Env: RABBITMQ_URL, RABBITMQ_EXCHANGE, RABBITMQ_QUEUE, RABBITMQ_BINDING.
 */
export function createRabbitSource() {
  const url = process.env.RABBITMQ_URL || "amqp://agri:agri@rabbitmq:5672/";
  const exchange = process.env.RABBITMQ_EXCHANGE || "amq.topic";
  const queue = process.env.RABBITMQ_QUEUE || "telemetria";
  const binding = process.env.RABBITMQ_BINDING || "farm.#";

  let connection = null;
  let channel = null;
  let chiuso = false;        // dopo stop(): niente riconnessioni
  let onRecordRef = null;    // callback di start(), riusata dopo un reconnect

  function scheduleReconnect() {
    if (chiuso) return;
    console.warn("[rabbitSource] riconnessione tra 3s…");
    setTimeout(() => connetti().catch(() => scheduleReconnect()), 3000);
  }

  async function connetti() {
    if (chiuso) return;
    connection = await amqp.connect(url);
    connection.on("error", (e) =>
      console.error("[rabbitSource] errore connessione:", e.message)
    );
    connection.on("close", () => {
      if (!chiuso) {
        console.warn("[rabbitSource] connessione chiusa");
        channel = null;
        scheduleReconnect();
      }
    });

    channel = await connection.createChannel();
    // amq.topic esiste già, ma assert è idempotente e copre gli exchange custom
    await channel.assertExchange(exchange, "topic", { durable: true });

    // durable: se il backend si ferma un attimo la telemetria resta in coda.
    // i messaggi illeggibili finiscono in telemetria.dlq (vedi definitions.json)
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "dlx",
        "x-dead-letter-routing-key": "telemetria.dlq",
      },
    });
    await channel.bindQueue(queue, exchange, binding);

    // max 50 messaggi non confermati alla volta, backpressure minima
    channel.prefetch(50);

    await channel.consume(
      queue,
      (msg) => {
        if (!msg) return;
        const testo = msg.content.toString("utf-8").trim();
        try {
          const record = JSON.parse(testo);
          if (onRecordRef) onRecordRef(record);
          channel.ack(msg);
        } catch {
          console.error("[rabbitSource] messaggio non JSON:", testo.slice(0, 120));
          // nack senza requeue, altrimenti gira in loop: va in DLQ
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    console.log(
      `[rabbitSource] consumo da queue '${queue}' (bind '${binding}' su '${exchange}')`
    );
  }

  /** onRecord(record) per ogni rilevazione ricevuta. */
  function start(onRecord) {
    onRecordRef = onRecord;
    chiuso = false;
    connetti().catch((e) => {
      console.error("[rabbitSource] avvio fallito:", e.message);
      scheduleReconnect();
    });
  }

  /**
   * { cmd:"set_irrigazione", campo_id, attivo?, modo? } -> farm.<campo>.cmd.
   * true se il comando è stato accodato sul canale.
   */
  function send(command) {
    if (!channel) return false;
    const campoId = command && command.campo_id;
    if (!campoId) return false;
    const routingKey = `farm.${campoId}.cmd`;
    const body = Buffer.from(JSON.stringify(command), "utf-8");
    return channel.publish(exchange, routingKey, body, {
      contentType: "application/json",
      persistent: true, // sopravvive a un riavvio del broker
    });
  }

  async function stop() {
    chiuso = true;
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch {
      /* chiusura best-effort */
    } finally {
      channel = null;
      connection = null;
    }
  }

  return { start, send, stop };
}
