import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const consultation = await db.consultation.findUnique({ where: { id } });
  if (!consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (consultation.doctorId && consultation.doctorId !== session.id) {
    return NextResponse.json({ error: "Consultation already claimed" }, { status: 400 });
  }

  const updated = await db.consultation.update({
    where: { id },
    data: {
      doctorId: session.id,
      status: "ACTIVE",
    },
  });

  await logAction(
    session.id,
    "CLAIM_CONSULTATION",
    "Consultation",
    id,
    { status: "ACTIVE", previousDoctorId: consultation.doctorId }
  );

  return NextResponse.json(updated);
}
