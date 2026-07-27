import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

/**
 * Budget forecasting and allocation control — MedHub tasks 6 and 9.
 *
 * v1 is a 3-period moving average, deliberately. It is explainable to a finance
 * officer, needs no training data, and degrades visibly rather than silently
 * when history is thin. The `method` column records which projection produced a
 * number so a better model can replace this without rewriting the readers.
 */

/** Periods averaged. Named rather than inline so the label stays truthful. */
const WINDOW = 3;

/** Sorts "2026-Q3" style labels chronologically. */
function comparePeriods(a: string, b: string): number {
  const [ay, aq] = a.split("-Q").map(Number);
  const [by, bq] = b.split("-Q").map(Number);
  return ay !== by ? ay - by : aq - bq;
}

/** The period after the given one. */
export function nextPeriod(period: string): string {
  const [y, q] = period.split("-Q").map(Number);
  return q === 4 ? `${y + 1}-Q1` : `${y}-Q${q + 1}`;
}

/**
 * Projects each category's next-period spend from its recent history.
 *
 * Uses ЕСОМП as the authoritative series: it is the system of record for
 * medical-service volumes, and averaging across sources would double-count the
 * same payment reported by several systems.
 */
export async function buildForecast(actorId = "system"): Promise<{
  period: string;
  categories: number;
}> {
  const records = await db.financeRecord.findMany({
    where: { source: "ESOMP" },
    orderBy: { recordedAt: "asc" },
  });

  if (records.length === 0) return { period: "", categories: 0 };

  // category -> period -> total
  const byCategory = new Map<string, Map<string, number>>();
  for (const r of records) {
    const periods = byCategory.get(r.category) ?? new Map<string, number>();
    periods.set(r.period, (periods.get(r.period) ?? 0) + Number(r.amount));
    byCategory.set(r.category, periods);
  }

  const allPeriods = [...new Set(records.map((r) => r.period))].sort(comparePeriods);
  const latest = allPeriods[allPeriods.length - 1];
  const target = nextPeriod(latest);

  let categories = 0;

  for (const [category, periods] of byCategory) {
    const ordered = [...periods.keys()].sort(comparePeriods);
    const window = ordered.slice(-WINDOW);
    const values = window.map((p) => periods.get(p) ?? 0);
    const forecast = values.reduce((a, b) => a + b, 0) / values.length;

    // Say plainly how thin the basis is — a "forecast" from one quarter is a
    // copy of that quarter, and a reader deserves to know that.
    const method =
      values.length >= WINDOW
        ? `moving_average_${WINDOW}`
        : `moving_average_${values.length}_insufficient_history`;

    await db.budgetForecast.upsert({
      where: { period_category: { period: target, category } },
      create: { period: target, category, forecastAmount: forecast, method },
      update: { forecastAmount: forecast, method },
    });
    categories++;
  }

  // Fill in actuals wherever a forecast period now has real data.
  for (const period of allPeriods) {
    const forecasts = await db.budgetForecast.findMany({ where: { period } });
    for (const f of forecasts) {
      const actual = (byCategory.get(f.category)?.get(period)) ?? null;
      if (actual !== null) {
        await db.budgetForecast.update({
          where: { id: f.id },
          data: { actualAmount: actual },
        });
      }
    }
  }

  await logAction(actorId, "BUILD_BUDGET_FORECAST", "BudgetForecast", target, {
    categories,
  });

  return { period: target, categories };
}

/**
 * Recomputes committed/spent against allocated funding — task 9.
 *
 * Returns the lines at risk: over-spend, and under-use (недоосвоение), which in
 * a state-funded clinic is penalised just as much as overspending.
 */
export async function assessAllocations(): Promise<{
  overspent: { programme: string; category: string; over: number }[];
  underused: { programme: string; category: string; usedPct: number }[];
}> {
  const allocations = await db.budgetAllocation.findMany();
  const overspent: { programme: string; category: string; over: number }[] = [];
  const underused: { programme: string; category: string; usedPct: number }[] = [];

  for (const a of allocations) {
    const allocated = Number(a.allocated);
    // Utilisation is `committed`, NOT committed + spent. Money is committed
    // first and spent out of that commitment, so spent is a subset — adding
    // them double-counts every tenge and reports almost every line as
    // overspent. `spent` is kept for cash-flow reporting, not utilisation.
    const used = Math.max(Number(a.committed), Number(a.spent));
    if (allocated <= 0) continue;

    if (used > allocated) {
      overspent.push({
        programme: a.programme,
        category: a.category,
        over: used - allocated,
      });
    } else {
      const usedPct = (used / allocated) * 100;
      // Below 70% through the period is the conventional under-use warning line.
      if (usedPct < 70) {
        underused.push({
          programme: a.programme,
          category: a.category,
          usedPct: Number(usedPct.toFixed(1)),
        });
      }
    }
  }

  return { overspent, underused };
}
