import Redis from "ioredis";

/**
 * Redis pub/sub for consultation chat.
 *
 * Deliberately does NOT reuse the shared connection from ./queue: ioredis puts a
 * connection into subscriber mode when you SUBSCRIBE, after which that
 * connection can no longer issue normal commands. BullMQ needs the shared one
 * for regular traffic, so publishing and subscribing get their own.
 *
 * See docs/plans/chat-realtime.md for why pub/sub rather than polling, and for
 * the connection-count ceiling this implies.
 */

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/** Events a consultation stream can carry. Keep in sync with the client. */
export type RealtimeEvent =
  /** A new chat message; payload is the created Message including its sender. */
  | { type: "message"; data: unknown }
  /** Something else changed (status, diagnosis, prescription) — refetch. */
  | { type: "sync" };

export function consultationChannel(consultationId: string): string {
  return `consultation:${consultationId}`;
}

// One shared publisher is fine — publishing never puts a connection into
// subscriber mode, so this connection stays usable for every caller.
let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });
    publisher.on("error", (err) => {
      // Never throw from here: a Redis outage must degrade chat to the stream's
      // 30s reconciliation, not fail the request that posted the message.
      console.error("[realtime] publisher error:", err.message);
    });
  }
  return publisher;
}

/**
 * Broadcast an event to everyone watching a consultation.
 *
 * Failures are logged and swallowed by design — the message is already
 * committed to Postgres at this point, and subscribers re-sync from the
 * database periodically, so a dropped publish costs latency, not data.
 */
export async function publish(
  consultationId: string,
  event: RealtimeEvent
): Promise<void> {
  try {
    await getPublisher().publish(
      consultationChannel(consultationId),
      JSON.stringify(event)
    );
  } catch (err) {
    console.error(
      `[realtime] failed to publish to consultation ${consultationId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Watch one consultation's channel.
 *
 * Opens a dedicated connection in subscriber mode and returns a function that
 * unsubscribes and closes it. Callers MUST invoke that function when the
 * consumer goes away, or connections leak one per abandoned stream.
 */
export function subscribe(
  consultationId: string,
  onEvent: (event: RealtimeEvent) => void
): () => Promise<void> {
  const channel = consultationChannel(consultationId);
  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });

  subscriber.on("error", (err) => {
    console.error(`[realtime] subscriber error on ${channel}:`, err.message);
  });

  subscriber.subscribe(channel).catch((err) => {
    console.error(`[realtime] failed to subscribe to ${channel}:`, err.message);
  });

  subscriber.on("message", (receivedChannel, payload) => {
    if (receivedChannel !== channel) return;
    try {
      onEvent(JSON.parse(payload) as RealtimeEvent);
    } catch {
      console.error(`[realtime] unparseable payload on ${channel}`);
    }
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
    } catch {
      // Connection may already be gone; quit below regardless.
    }
    subscriber.disconnect();
  };
}
