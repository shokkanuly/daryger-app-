import { db } from "../src/lib/db";

async function main() {
  // Check that key terms appear in the service catalog synonyms
  const terms = ["кардиолог", "педиатр", "вич", "терапевт", "венеролог", "аллерголог", "мазок", "амилаза"];
  
  for (const term of terms) {
    const matches = await db.service.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { synonyms: { has: term } }
        ]
      },
      select: { name: true, synonyms: true }
    });
    console.log(`\nTerm: "${term}" => ${matches.length} catalog entries:`);
    matches.slice(0, 3).forEach(m => console.log(`  - ${m.name}: [${m.synonyms.slice(0, 3).join(", ")}]`));
  }
}

main().catch(console.error).finally(() => db.$disconnect());
