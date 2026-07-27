import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { importSampleExports, runReconciliation } from "@/lib/finance/reconcile";
import { buildForecast } from "@/lib/finance/forecast";
import { runHrAnomalyScan } from "@/lib/hr/anomaly-rules";

/**
 * Runs the whole finance pipeline: import exports, reconcile, forecast, scan HR.
 *
 * One endpoint rather than four because these are ordered — reconciliation
 * needs the imports, the forecast needs the records — and an operator running
 * them out of order would see stale numbers and reasonably conclude the system
 * is broken.
 */
export async function POST() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "FINANCE_ANALYST" && session.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const imported = await importSampleExports(session.id);
  const flags = await runReconciliation(session.id);
  const forecast = await buildForecast(session.id);
  const hrFindings = await runHrAnomalyScan(session.id);

  return NextResponse.json({ imported, flags, forecast, hrFindings });
}
