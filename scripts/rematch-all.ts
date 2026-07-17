import { db } from "../src/lib/db";
import { matchService } from "../src/lib/catalog/matcher";

async function main() {
  console.log("=== STARTING CLASSIFICATION REMATCHING ===");

  const priceRecords = await db.priceRecord.findMany({
    where: { isActive: true },
  });

  console.log(`Loaded ${priceRecords.length} active price records from database.`);

  let newlyVerifiedCount = 0;
  let alreadyVerifiedCount = 0;
  let stillUnmappedCount = 0;

  for (let i = 0; i < priceRecords.length; i++) {
    const record = priceRecords[i];
    const { serviceId, confidence } = await matchService(record.serviceNameRaw);

    if (serviceId) {
      if (record.serviceId === serviceId && record.isVerified) {
        alreadyVerifiedCount++;
      } else {
        // Update database record
        await db.priceRecord.update({
          where: { id: record.id },
          data: {
            serviceId,
            isVerified: true,
            verificationNote: "",
          },
        });

        // Update match queue item if it exists
        await db.matchQueueItem.updateMany({
          where: { rawName: record.serviceNameRaw },
          data: {
            status: "APPROVED",
            suggestedServiceId: serviceId,
          },
        });

        newlyVerifiedCount++;
      }
    } else {
      stillUnmappedCount++;
    }

    if ((i + 1) % 500 === 0) {
      console.log(`Processed ${i + 1}/${priceRecords.length} records...`);
    }
  }

  const total = priceRecords.length;
  const totalVerified = alreadyVerifiedCount + newlyVerifiedCount;
  const rate = total > 0 ? Math.round((totalVerified / total) * 100) : 100;

  console.log("=== REMATCH COMPLETED ===");
  console.log(`Already matched: ${alreadyVerifiedCount}`);
  console.log(`Newly matched: ${newlyVerifiedCount}`);
  console.log(`Still unmapped: ${stillUnmappedCount}`);
  console.log(`Final Normalisation Rate: ${rate}% (Verified: ${totalVerified}/${total})`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => db.$disconnect());
