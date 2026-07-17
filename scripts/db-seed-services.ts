import { db } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== SEEDING MERGED SERVICES TO DATABASE ===");

  const servicesData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../prisma/seed-data/services.json"), "utf-8")
  );

  console.log(`Loaded ${servicesData.length} total services from seed file.`);

  // Load existing database service names to prevent duplicates
  const existingServices = await db.service.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existingServices.map(s => s.name.toLowerCase().trim()));

  let insertedCount = 0;
  let skippedCount = 0;

  for (const s of servicesData) {
    const sNameLower = s.name.toLowerCase().trim();
    if (existingNames.has(sNameLower)) {
      skippedCount++;
      continue;
    }

    await db.service.create({
      data: {
        name: s.name,
        synonyms: s.synonyms,
        category: s.category,
        icdCode: s.icdCode,
        isActive: true,
      },
    });

    existingNames.add(sNameLower);
    insertedCount++;
  }

  console.log("=== SEEDING COMPLETED ===");
  console.log(`Skipped (already in DB): ${skippedCount}`);
  console.log(`Newly inserted: ${insertedCount}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => db.$disconnect());
