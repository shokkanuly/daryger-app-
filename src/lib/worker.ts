import { Worker } from "bullmq";
import Redis from "ioredis";
import { runCrawlJob } from "./catalog/ingest";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let worker: Worker | null = null;

export function startWorker() {
  if (worker) {
    console.log("BullMQ crawl-queue Worker is already running.");
    return;
  }

  console.log("Starting BullMQ crawl-queue Worker...");
  
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  worker = new Worker(
    "crawl-queue",
    async (job) => {
      const { adapterName } = job.data;
      console.log(`[Worker] Started crawl job ${job.id} for adapter: ${adapterName}`);
      await runCrawlJob(adapterName);
      console.log(`[Worker] Finished crawl job ${job.id} for adapter: ${adapterName}`);
    },
    { connection: connection as any }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });
}
