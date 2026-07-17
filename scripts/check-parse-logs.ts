import { db } from "../src/lib/db";

async function main() {
  const docs = await db.priceDocument.findMany({
    orderBy: { parsedAt: "desc" },
    take: 5,
  });

  console.log("=== PRICE DOCUMENTS ===");
  for (const doc of docs) {
    console.log(`ID: ${doc.id}`);
    console.log(`File: ${doc.fileName}`);
    console.log(`Status: ${doc.parseStatus}`);
    console.log(`Log:\n${doc.parseLog}`);
    console.log("------------------------");
  }

  const matchItemsCount = await db.matchQueueItem.count();
  console.log(`Total MatchQueueItems: ${matchItemsCount}`);

  const priceRecordsCount = await db.priceRecord.count();
  const verifiedRecordsCount = await db.priceRecord.count({
    where: { isVerified: true },
  });
  console.log(`Total PriceRecords: ${priceRecordsCount}`);
  console.log(`Verified PriceRecords: ${verifiedRecordsCount}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => db.$disconnect());
