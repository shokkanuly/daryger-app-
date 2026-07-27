import { Worker } from "bullmq";
import Redis from "ioredis";
import { runCrawlJob } from "./catalog/ingest";
import { parseDocumentJob } from "./jobs/parse-document";
import { db } from "./db";
import { IkomekAdapter } from "./adapters/appeals/ikomek";
import { CrmAdapter } from "./adapters/appeals/crm";
import { EotinishAdapter } from "./adapters/appeals/eotinish";
import { syncAllSources } from "./sources/sync";
import { getQueue } from "./queue";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let crawlWorker: Worker | null = null;
let docWorker: Worker | null = null;
let opsWorker: Worker | null = null;

export function startWorker() {
  if (crawlWorker && docWorker && opsWorker) {
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

  if (!opsWorker) {
    console.log("Starting BullMQ ops-queue Worker...");
    opsWorker = new Worker(
      "ops-queue",
      async (job) => {
        if (job.name === "sync-source-systems") {
          // Track 1 · task 01 — pull the five clinic systems into the
          // consolidated layer and reconcile. syncAllSources isolates each
          // system's failures internally, so one unreachable source does not
          // abort the run.
          console.log("[Worker] Running scheduled source-system consolidation...");
          const result = await syncAllSources();
          const failed = result.systems.filter((s) => s.error);
          console.log(
            `[Worker] Consolidation done: ${result.systems.length - failed.length}/${result.systems.length} systems, ${result.conflicts} conflicts`
          );
          for (const f of failed) {
            console.error(`[Worker] Source ${f.system} failed: ${f.error}`);
          }
        }

        if (job.name === "poll-appeals-and-sla") {
          console.log("[Worker] Running scheduled appeals poll and SLA check...");
          // 1. Run SLA check
          const now = new Date();
          await db.appeal.updateMany({
            where: {
              status: { in: ["NEW", "IN_PROGRESS"] },
              slaDueAt: { lt: now }
            },
            data: { status: "OVERDUE" }
          });

          // 2. Poll adapters
          const adapters = [new IkomekAdapter(), new CrmAdapter(), new EotinishAdapter()];
          for (const adapter of adapters) {
            try {
              const drafts = await adapter.fetchNew();
              for (const draft of drafts) {
                const existing = await db.appeal.findFirst({
                  where: {
                    externalRef: draft.externalRef,
                    channel: draft.channel,
                  },
                });
                if (!existing) {
                  await db.appeal.create({
                    data: {
                      channel: draft.channel,
                      externalRef: draft.externalRef,
                      subject: draft.subject,
                      body: draft.body,
                      status: "NEW",
                      slaDueAt: draft.slaDueAt,
                      createdAt: draft.createdAt || new Date(),
                    },
                  });
                }
              }
            } catch (err) {
              console.error(`[Worker] Error polling appeals for channel ${adapter.channel}:`, err);
            }
          }
        }
      },
      { connection: connection as any }
    );

    opsWorker.on("completed", (job) => console.log(`[Worker] Ops Job ${job.id} completed`));
    opsWorker.on("failed", (job, err) => console.error(`[Worker] Ops Job ${job?.id} failed:`, err));

    // Register repeatable job
    const opsQueue = getQueue("ops-queue");
    opsQueue.add("poll-appeals-and-sla", {}, {
      repeat: { pattern: "*/5 * * * *" }
    }).catch(err => console.error("[Worker] Failed to add repeatable job:", err));

    // Source consolidation runs less often than the appeals poll — these are
    // whole-registry pulls, not an inbox.
    opsQueue.add("sync-source-systems", {}, {
      repeat: { pattern: "*/15 * * * *" }
    }).catch(err => console.error("[Worker] Failed to add source sync job:", err));
  }
}

