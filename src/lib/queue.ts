import { Queue } from "bullmq";
import type Redis from "ioredis";
import { createRedisConnection } from "./redis";

/**
 * BullMQ queue accessor.
 *
 * The connection is created on first use rather than at import time. Opening it
 * at module scope meant any route importing this file started dialling Redis
 * during startup — which on a deployment without a Redis service crash-looped
 * the container before a single request was served.
 */

let connection: Redis | null = null;

function getConnection(): Redis {
  if (!connection) {
    connection = createRedisConnection("queue");
  }
  return connection;
}

const queues: Record<string, Queue> = {};

export function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getConnection() as never });
  }
  return queues[name];
}
