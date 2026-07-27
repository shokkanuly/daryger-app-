import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { gatherStats, generateConsolidationSummary } from "@/lib/sources/analytics";

/** Consolidation statistics plus a plain-language management summary. */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await gatherStats();
  const { summary, source } = await generateConsolidationSummary(stats);

  return NextResponse.json({ stats, summary, summarySource: source });
}
