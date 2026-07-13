import { Worker } from "bullmq";
import Redis from "ioredis";
import { runCrawlJob } from "./catalog/ingest";
import { parseDocumentJob } from "./jobs/parse-document";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let crawlWorker: Worker | null = null;
let docWorker: Worker | null = null;

export function startWorker() {
  if (crawlWorker && docWorker) {
    console.log("BullMQ Workers are already running.");
    return;
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  if (!crawlWorker) {
    console.log("Starting BullMQ crawl-queue Worker...");
    crawlWorker = new Worker(
      "crawl-queue",
      async (job) => {
        const { adapterName } = job.data;
        console.log(`[Worker] Started crawl job ${job.id} for adapter: ${adapterName}`);
        await runCrawlJob(adapterName);
      },
      { connection: connection as any }
    );
    crawlWorker.on("completed", (job) => console.log(`[Worker] Crawl Job ${job.id} completed`));
    crawlWorker.on("failed", (job, err) => console.error(`[Worker] Crawl Job ${job?.id} failed:`, err));
  }

  if (!docWorker) {
    console.log("Starting BullMQ parse-document-queue Worker...");
    docWorker = new Worker(
      "parse-document-queue",
      async (job) => {
        const { docId } = job.data;
        console.log(`[Worker] Started parse document job ${job.id} for docId: ${docId}`);
        await parseDocumentJob(docId);
      },
      { connection: connection as any }
    );
    docWorker.on("completed", (job) => console.log(`[Worker] Document parse Job ${job.id} completed`));
    docWorker.on("failed", (job, err) => console.error(`[Worker] Document parse Job ${job?.id} failed:`, err));
  }
}
