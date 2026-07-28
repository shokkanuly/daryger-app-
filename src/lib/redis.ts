import Redis, { RedisOptions } from "ioredis";

/**
 * Single place where Redis connections are made.
 *
 * Three things went wrong on a real deployment and are fixed here:
 *
 * 1. A silent localhost fallback. `process.env.REDIS_URL || "127.0.0.1:6379"`
 *    turns "you forgot to add a Redis service" into an endless ECONNREFUSED
 *    loop against an address that cannot exist in a container. In production
 *    a missing URL is now a clear, immediate error naming the fix.
 *
 * 2. No error listener. ioredis emits `error` on every failed reconnect; with
 *    no listener attached that becomes an unhandled error event and takes the
 *    whole process down. On Railway this produced a crash loop:
 *    SIGTERM -> Stopping Container -> restart -> repeat.
 *
 * 3. Connecting at module scope. queue.ts opened a connection as a side effect
 *    of being imported, so a single API route importing it began dialling
 *    Redis during startup, before anything needed a queue. Connections are now
 *    lazy — created on first real use.
 */

const isProduction = process.env.NODE_ENV === "production";

/** Local default, used only outside production. */
const LOCAL_FALLBACK = "redis://127.0.0.1:6379";

export function getRedisUrl(): string {
  const url = process.env.REDIS_URL;

  if (!url) {
    if (isProduction) {
      throw new Error(
        "REDIS_URL is not set. Redis backs the job queues and the live " +
          "consultation chat, so the app cannot run without it. On Railway: " +
          "add a Redis service to the project, then reference it from this " +
          "service's variables as REDIS_URL=${{Redis.REDIS_URL}}."
      );
    }
    return LOCAL_FALLBACK;
  }

  return url;
}

/**
 * Creates a connection with the settings BullMQ requires and an error listener
 * attached before anything can emit.
 *
 * `lazyConnect` keeps construction free of I/O: nothing dials until a command
 * is issued or `.connect()` is called.
 */
export function createRedisConnection(label: string, options: RedisOptions = {}): Redis {
  const client = new Redis(getRedisUrl(), {
    // BullMQ requires this to be null.
    maxRetriesPerRequest: null,
    lazyConnect: true,
    ...options,
  });

  // Must be attached synchronously — an 'error' with no listener is fatal.
  client.on("error", (err) => {
    console.error(`[redis:${label}] ${err.message}`);
  });

  return client;
}
