import { db } from "../src/lib/db";

async function main() {
  console.log("=== CLEARING INGESTION DATA FROM DATABASE ===");

  // Delete in reverse order of foreign key dependencies
  const priceRecordDelete = await db.priceRecord.deleteMany({});
  console.log(`Deleted ${priceRecordDelete.count} PriceRecords.`);

  const matchQueueDelete = await db.matchQueueItem.deleteMany({});
  console.log(`Deleted ${matchQueueDelete.count} MatchQueueItems.`);

  const priceDocDelete = await db.priceDocument.deleteMany({});
  console.log(`Deleted ${priceDocDelete.count} PriceDocuments.`);

  const rawCaptureDelete = await db.rawCapture.deleteMany({});
  console.log(`Deleted ${rawCaptureDelete.count} RawCaptures.`);

  console.log("=== DATABASE CLEAR COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((e) => console.error(e))
  .finally(() => db.$disconnect());
