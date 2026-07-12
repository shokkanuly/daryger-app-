import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const consultation = await db.consultation.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, town: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    consultation.patientId === session.id ||
    consultation.doctorId === session.id ||
    (session.role === "DOCTOR" && !consultation.doctorId);

  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(consultation);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, diagnosis, prescription, followupApproved } = await req.json();

  const consultation = await db.consultation.update({
    where: { id },
    data: {
      status,
      diagnosis,
      prescription,
      followupApproved: followupApproved ?? false,
      doctorId: session.id,
    },
  });

  await logAction(
    session.id,
    "COMPLETE_CONSULTATION",
    "Consultation",
    consultation.id,
    { status, diagnosis, prescription, followupApproved }
  );

  return NextResponse.json(consultation);
}

