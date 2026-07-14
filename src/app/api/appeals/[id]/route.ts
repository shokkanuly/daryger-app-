import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || session.role === "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, assignedTo } = await req.json();

  const existing = await db.appeal.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
  }

  const updated = await db.appeal.update({
    where: { id },
    data: {
      status: status !== undefined ? status : existing.status,
      assignedTo: assignedTo !== undefined ? assignedTo : existing.assignedTo,
    },
  });

  // Write audit log entry for appeals administration compliance
  await logAction(
    session.id,
    "UPDATE_APPEAL",
    "Appeal",
    id,
    { status, assignedTo }
  );

  return NextResponse.json(updated);
}
