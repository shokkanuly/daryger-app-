import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFinanceAdapters } from "@/lib/finance/reconcile";
import { assessAllocations } from "@/lib/finance/forecast";
import { assessContracts } from "@/lib/finance/contracts";

/**
 * Finance overview — MedHub tasks 5-9 in one payload.
 *
 * ⚠️ Every source is an uploaded/mock export; none of ЕСОМП, Казына or 1С is
 * connected. See docs/plans/finance-and-management.md.
 */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FINANCE_ANALYST" && session.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adapters = getFinanceAdapters();

  const [sources, openFlags, forecasts, allocations, contracts] = await Promise.all([
    Promise.all(
      adapters.map(async (a) => ({
        source: a.source,
        label: a.label,
        records: await db.financeRecord.count({ where: { source: a.source } }),
        isMocked: true,
      }))
    ),
    db.reconciliationFlag.findMany({
      where: { status: "OPEN" },
      orderBy: { discrepancy: "desc" },
      take: 100,
    }),
    db.budgetForecast.findMany({ orderBy: { category: "asc" } }),
    assessAllocations(),
    assessContracts(),
  ]);

  const totalDiscrepancy = openFlags.reduce(
    (sum, f) => sum + Number(f.discrepancy),
    0
  );

  return NextResponse.json({
    sources,
    reconciliation: {
      openFlags: openFlags.length,
      totalDiscrepancy,
      flags: openFlags,
    },
    forecasts,
    allocations,
    contracts,
  });
}
