import { db } from "../src/lib/db";
import { cleanRawName, matchService } from "../src/lib/catalog/matcher";

async function main() {
  // Sample 50 unmatched items
  const unmatched = await db.matchQueueItem.findMany({ 
    take: 50,
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" } 
  });

  console.log(`\nSampling ${unmatched.length} unmatched raw names:\n`);
  
  // Also test matching on a few to see scores
  for (const item of unmatched.slice(0, 20)) {
    const cleaned = cleanRawName(item.rawName);
    const { serviceId, confidence } = await matchService(item.rawName);
    console.log(`[${confidence.toFixed(2)}] RAW: "${item.rawName.slice(0, 60)}" => CLEAN: "${cleaned.slice(0, 50)}" => SVC: ${serviceId ? "MATCHED" : "none"}`);
  }
  
  // Also see what services are in the DB
  const svcCount = await db.service.count();
  const priceCount = await db.priceRecord.count();
  const verifiedCount = await db.priceRecord.count({ where: { isVerified: true } });
  console.log(`\nService catalog size: ${svcCount}`);
  console.log(`Total PriceRecords: ${priceCount}`);
  console.log(`Verified PriceRecords: ${verifiedCount}`);
  console.log(`Rate: ${priceCount > 0 ? Math.round(verifiedCount/priceCount*100) : 0}%`);
}

main().catch(console.error).finally(() => db.$disconnect());
