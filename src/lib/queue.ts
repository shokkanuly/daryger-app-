import { Queue } from "bullmq";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// We create a shared ioredis instance. maxRetriesPerRequest must be null for BullMQ compatibility.
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

const queues: Record<string, Queue> = {};

export function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: connection as any });
  }
  return queues[name];
}
