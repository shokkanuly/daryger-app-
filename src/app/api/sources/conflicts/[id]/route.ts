import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

/**
 * Resolves a conflict by recording which value an operator accepted.
 *
 * The chosen value is stored on the conflict rather than written back over the
 * ConsolidatedRecord rows: each system's own copy stays exactly as that system
 * reported it, so the audit trail survives and a later sync does not silently
 * undo the decision.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession("SYSTEM_ADMIN");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { resolvedTo } = await req.json();

  if (typeof resolvedTo !== "string" || resolvedTo.length === 0) {
    return NextResponse.json({ error: "resolvedTo is required" }, { status: 400 });
  }

  const existing = await db.recordConflict.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "OPEN") {
    return NextResponse.json({ error: "Conflict already resolved" }, { status: 409 });
  }

  const updated = await db.recordConflict.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedTo,
      resolvedBy: session.id,
      resolvedAt: new Date(),
    },
  });

  await logAction(session.id, "RESOLVE_RECORD_CONFLICT", "RecordConflict", id, {
    subjectRef: existing.subjectRef,
    field: existing.field,
    resolvedTo,
  });

  return NextResponse.json(updated);
}
