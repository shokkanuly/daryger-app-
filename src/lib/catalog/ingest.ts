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
  let adapter: CrawlerAdapter;

  if (adapterName === "kdl") {
    adapter = new KdlAdapter();
  } else if (adapterName === "invitro") {
    adapter = new InvitroAdapter();
  } else if (adapterName === "doq") {
    adapter = new DoqAdapter();
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
        // Each source publishes prices for a specific city; defaulting them all
        // to Karaganda mislabelled every crawled row.
        city: adapter.city ?? "Karaganda",
        sourceUrl: adapter.sourceUrl,
        sourceType: "PUBLIC",
      },
    });
  }

  try {
    const { rows: rawRows, provenance, note } = await adapter.fetch();

    // Provenance decides whether these rows may be presented as real prices.
    // FALLBACK rows are the adapter's built-in sample data and must stay
    // distinguishable all the way into PriceRecord.
    const isLive = provenance === "LIVE";
    console.log(
      `${isLive ? "Scraped" : "FELL BACK TO SAMPLE DATA for"} ${rawRows.length} services ` +
        `from ${adapter.clinicName}${note ? ` — ${note}` : ""}`
    );

    // Save capture data payload to MinIO
    const captureKey = `crawls/${adapterName}_${Date.now()}.json`;
    const payload = JSON.stringify({
      clinicName: adapter.clinicName,
      fetchedAt: new Date().toISOString(),
      itemsCount: rawRows.length,
      provenance,
      note,
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

      // Dedup on the raw name, never on serviceId — a source legitimately lists
      // several distinct services that normalize to one catalogue entry, and
      // keying on serviceId makes each overwrite the previous within a single
      // run. Same reasoning as the document path in
      // src/lib/jobs/parse-document.ts.
      const existingRecord = await db.priceRecord.findFirst({
        where: {
          clinicId: clinic.id,
          serviceNameRaw: rawName,
          parsedAt: { gte: startOfDay, lte: endOfDay },
          isActive: true,
        },
      });

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
            sourceType: isLive ? "CRAWL" : "CRAWL_FALLBACK",
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
      data: { status: isLive ? "PARSED" : "PARSED_FALLBACK" },
    });

    console.log(
      `Ingestion completed for ${adapter.clinicName} (provenance: ${provenance})`
    );
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
