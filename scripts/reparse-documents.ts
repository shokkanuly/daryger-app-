/**
 * Re-runs ingestion for every PriceDocument against the current parser.
 *
 * Needed after a parser fix changes what the same source file yields. Existing
 * rows are archived (isActive = false) rather than deleted: §4 of the ТЗ
 * requires raw data be retained for audit, and the Phase 2 rule is
 * archive-never-overwrite so price history stays intact.
 *
 * Usage:
 *   npx tsx scripts/reparse-documents.ts            # dry run, prints what would change
 *   npx tsx scripts/reparse-documents.ts --apply    # archive + reparse
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { parseDocumentJob } from "../src/lib/jobs/parse-document";

async function main() {
  const apply = process.argv.includes("--apply");

  const docs = await db.priceDocument.findMany({
    include: { clinic: true },
    orderBy: { parsedAt: "asc" },
  });

  if (docs.length === 0) {
    console.log("No price documents to reparse.");
    return;
  }

  const activeBefore = await db.priceRecord.count({ where: { isActive: true } });
  console.log(`Documents: ${docs.length}`);
  console.log(`Active price rows before: ${activeBefore}`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to archive these and reparse.");
    for (const d of docs) {
      const n = await db.priceRecord.count({
        where: { sourceDocId: d.id, isActive: true },
      });
      console.log(`  ${d.fileName} — ${n} active rows would be archived`);
    }
    return;
  }

  for (const doc of docs) {
    const { count } = await db.priceRecord.updateMany({
      where: { sourceDocId: doc.id, isActive: true },
      data: { isActive: false },
    });
    console.log(`\nArchived ${count} rows from ${doc.fileName}; reparsing…`);
    await parseDocumentJob(doc.id);

    const fresh = await db.priceDocument.findUnique({ where: { id: doc.id } });
    console.log(`  status: ${fresh?.parseStatus}`);
  }

  const activeAfter = await db.priceRecord.count({ where: { isActive: true } });
  console.log(`\nActive price rows after: ${activeAfter}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
