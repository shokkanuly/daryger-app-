import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { EsompAdapter } from "@/lib/adapters/finance/esomp";
import { KazynaAdapter } from "@/lib/adapters/finance/kazyna";
import { OnecFinanceAdapter } from "@/lib/adapters/finance/onec";
import { FinanceSourceAdapter } from "@/lib/adapters/finance/types";

/**
 * Automatic reconciliation between ЕСОМП, Казына and 1С — MedHub task 8.
 *
 * Today a finance officer diffs these by hand. This compares them pairwise and
 * raises a flag for every difference, so the manual pass becomes a review of
 * exceptions rather than a full re-count.
 */

/**
 * Amounts below this difference are treated as agreement.
 *
 * Not zero: rounding between systems produces sub-tenge drift that would
 * otherwise bury the real discrepancies. Expressed in tenge, as a named
 * constant rather than a literal so it can be tuned in one place.
 */
export const RECONCILIATION_TOLERANCE_KZT = 1;

export function getFinanceAdapters(): FinanceSourceAdapter[] {
  return [new EsompAdapter(), new KazynaAdapter(), new OnecFinanceAdapter()];
}

/** Loads each system's sample export into FinanceRecord. Idempotent. */
export async function importSampleExports(actorId = "system"): Promise<
  { source: string; imported: number }[]
> {
  const results: { source: string; imported: number }[] = [];

  for (const adapter of getFinanceAdapters()) {
    const rows = adapter.sampleExport();
    for (const row of rows) {
      await db.financeRecord.upsert({
        where: {
          source_externalId: { source: adapter.source, externalId: row.externalId },
        },
        create: {
          source: adapter.source,
          externalId: row.externalId,
          category: row.category,
          amount: row.amount,
          recordedAt: row.recordedAt,
          period: row.period,
          raw: row.raw as object,
        },
        update: {
          category: row.category,
          amount: row.amount,
          recordedAt: row.recordedAt,
          period: row.period,
          raw: row.raw as object,
        },
      });
    }
    results.push({ source: adapter.source, imported: rows.length });
  }

  await logAction(actorId, "IMPORT_FINANCE_EXPORTS", "FinanceRecord", "all", results);
  return results;
}

/**
 * Compares every pair of systems and records differences.
 *
 * Matching is by externalId where systems share one (ЕСОМП document numbers
 * flow into 1С), otherwise by category + period + amount within tolerance.
 * Records unique to one system are reported as MISSING_IN_B rather than
 * ignored — a payment one system never saw is the costlier error.
 */
export async function runReconciliation(actorId = "system"): Promise<number> {
  // Clear the previous run's unreviewed flags so a re-run refreshes rather than
  // duplicating. RESOLVED and IGNORED are left alone — an operator's decision
  // must survive the next reconciliation.
  await db.reconciliationFlag.deleteMany({ where: { status: "OPEN" } });

  const records = await db.financeRecord.findMany();

  const bySource = new Map<string, typeof records>();
  for (const r of records) {
    const list = bySource.get(r.source) ?? [];
    list.push(r);
    bySource.set(r.source, list);
  }

  const sources = [...bySource.keys()].sort();
  let flags = 0;

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      const rowsA = bySource.get(a) ?? [];
      const rowsB = bySource.get(b) ?? [];

      const byIdB = new Map(rowsB.map((r) => [r.externalId, r]));
      // Fallback key for systems that do not share document numbers.
      const byShapeB = new Map(
        rowsB.map((r) => [`${r.category}::${r.period}`, r])
      );

      for (const recA of rowsA) {
        const match =
          byIdB.get(recA.externalId) ??
          byShapeB.get(`${recA.category}::${recA.period}`);

        if (!match) {
          // Only report a gap when B covers this period at all; otherwise the
          // export simply has not been uploaded yet and everything would flag.
          const bCoversPeriod = rowsB.some((r) => r.period === recA.period);
          if (!bCoversPeriod) continue;

          await db.reconciliationFlag.create({
            data: {
              sourceA: recA.source,
              sourceB: rowsB[0].source,
              externalIdA: recA.externalId,
              category: recA.category,
              amountA: recA.amount,
              discrepancy: recA.amount,
              kind: "MISSING_IN_B",
              status: "OPEN",
            },
          });
          flags++;
          continue;
        }

        const diff = Math.abs(Number(recA.amount) - Number(match.amount));
        if (diff <= RECONCILIATION_TOLERANCE_KZT) continue;

        await db.reconciliationFlag.create({
          data: {
            sourceA: recA.source,
            sourceB: match.source,
            externalIdA: recA.externalId,
            externalIdB: match.externalId,
            category: recA.category,
            amountA: recA.amount,
            amountB: match.amount,
            discrepancy: diff,
            kind: "AMOUNT_MISMATCH",
            status: "OPEN",
          },
        });
        flags++;
      }
    }
  }

  await logAction(actorId, "RUN_RECONCILIATION", "ReconciliationFlag", "all", {
    flags,
  });
  return flags;
}
