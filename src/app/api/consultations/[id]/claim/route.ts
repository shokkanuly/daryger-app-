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

  // Claim conditionally rather than check-then-update: two doctors hitting this
  // endpoint at once would both pass a separate existence check and the second
  // update would silently steal the consultation. Narrowing the WHERE to
  // unclaimed rows makes the database arbitrate, so exactly one caller wins.
  const { count } = await db.consultation.updateMany({
    where: { id, doctorId: null },
    data: {
      doctorId: session.id,
      status: "ACTIVE",
    },
  });

  if (count === 0) {
    // Either another doctor won the race, or this doctor already holds it.
    const current = await db.consultation.findUnique({ where: { id } });
    if (current?.doctorId === session.id) return NextResponse.json(current);
    return NextResponse.json({ error: "Consultation already claimed" }, { status: 409 });
  }

  const updated = await db.consultation.findUnique({ where: { id } });

  await logAction(
    session.id,
    "CLAIM_CONSULTATION",
    "Consultation",
    id,
    { status: "ACTIVE", previousDoctorId: consultation.doctorId }
  );

  return NextResponse.json(updated);
}
