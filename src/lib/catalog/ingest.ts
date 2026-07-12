import { db } from "@/lib/db";
import { putObject } from "@/lib/storage";
import { matchService } from "./matcher";
import { KdlAdapter } from "../crawler/sources/kdl";
import { InvitroAdapter } from "../crawler/sources/invitro";
import { DoqAdapter } from "../crawler/sources/doq";
import { CrawlerAdapter } from "../crawler/adapter";

/**
 * Runs a crawl job for a specific adapter and processes the results.
 * Isolated source run: logs adapter errors without failing the whole process.
 */
export async function runCrawlJob(adapterName: "kdl" | "invitro" | "doq"): Promise<void> {
  let adapter: CrawlerAdapter & { sourceUrl: string };
  
  if (adapterName === "kdl") {
    adapter = new KdlAdapter() as any;
  } else if (adapterName === "invitro") {
    adapter = new InvitroAdapter() as any;
  } else if (adapterName === "doq") {
    adapter = new DoqAdapter() as any;
  } else {
    throw new Error(`Unknown adapter: ${adapterName}`);
  }

  console.log(`Starting crawl for adapter: ${adapter.clinicName}`);

  // Fetch or create the Clinic in DB
  let clinic = await db.clinic.findFirst({
    where: { name: adapter.clinicName },
  });

  if (!clinic) {
    clinic = await db.clinic.create({
      data: {
        name: adapter.clinicName,
        city: "Karaganda",
        sourceUrl: adapter.sourceUrl,
        sourceType: "PUBLIC",
      },
    });
  }

  try {
    const rawRows = await adapter.fetch();
    console.log(`Scraped ${rawRows.length} services from ${adapter.clinicName}`);

    // Save capture data payload to MinIO
    const captureKey = `crawls/${adapterName}_${Date.now()}.json`;
    const payload = JSON.stringify({
      clinicName: adapter.clinicName,
      fetchedAt: new Date().toISOString(),
      itemsCount: rawRows.length,
      rows: rawRows,
    });
    
    await putObject(captureKey, payload, "application/json");

    // Log the RawCapture row in DB
    const capture = await db.rawCapture.create({
      data: {
        clinicId: clinic.id,
        sourceUrl: adapter.sourceUrl,
        rawContent: captureKey,
        status: "PENDING",
      },
    });

    // Process ingestion & matching for each raw row
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    for (const row of rawRows) {
      const rawName = row.serviceNameRaw;
      const price = row.priceKzt;

      // Calculate standardization mapping
      const { serviceId, confidence } = await matchService(rawName);

      // Check if price record exists for this day (dedup)
      let existingRecord = null;
      if (serviceId) {
        existingRecord = await db.priceRecord.findFirst({
          where: {
            clinicId: clinic.id,
            serviceId,
            parsedAt: { gte: startOfDay, lte: endOfDay },
            isActive: true,
          },
        });
      } else {
        existingRecord = await db.priceRecord.findFirst({
          where: {
            clinicId: clinic.id,
            serviceNameRaw: rawName,
            serviceId: null,
            parsedAt: { gte: startOfDay, lte: endOfDay },
            isActive: true,
          },
        });
      }

      let priceRecord;
      if (existingRecord) {
        priceRecord = await db.priceRecord.update({
          where: { id: existingRecord.id },
          data: {
            priceKzt: price,
            durationDays: row.durationDays,
            parsedAt: new Date(),
          },
        });
      } else {
        priceRecord = await db.priceRecord.create({
          data: {
            clinicId: clinic.id,
            serviceId,
            serviceNameRaw: rawName,
            priceKzt: price,
            durationDays: row.durationDays,
            parsedAt: new Date(),
            isActive: true,
            sourceType: "CRAWL",
          },
        });
      }

      // If confidence threshold is not met, enqueue manual matching review
      if (!serviceId) {
        const existingQueueItem = await db.matchQueueItem.findFirst({
          where: { rawName, status: "PENDING" },
        });
        if (!existingQueueItem) {
          await db.matchQueueItem.create({
            data: {
              rawName,
              suggestedServiceId: null, // If confidence low, we can still suggest the fuzzy match id if available
              confidence,
              status: "PENDING",
              sourceRecordId: priceRecord.id,
            },
          });
        }
      }
    }

    // Update raw capture status
    await db.rawCapture.update({
      where: { id: capture.id },
      data: { status: "PARSED" },
    });

    console.log(`Ingestion completed for ${adapter.clinicName}`);
  } catch (err: any) {
    console.error(`Failure executing crawl run for ${adapter.clinicName}:`, err);
    // Track error in database raw captures if possible
    await db.rawCapture.create({
      data: {
        clinicId: clinic.id,
        sourceUrl: adapter.sourceUrl,
        rawContent: `error: ${err.message}`,
        status: "ERROR",
      },
    });
  }
}
