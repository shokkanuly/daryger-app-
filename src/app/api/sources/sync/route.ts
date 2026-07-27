import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncAllSources } from "@/lib/sources/sync";

/** Triggers a consolidation run across every source system. Admin only. */
export async function POST() {
  const session = await requireSession("SYSTEM_ADMIN");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncAllSources(session.id);
  return NextResponse.json(result);
}
