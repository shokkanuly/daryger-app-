import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { publish } from "@/lib/realtime";

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
        // Internal (doctor-to-doctor) messages are filtered out below for
        // patients; fetched here so doctors keep seeing them in the thread.
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

  // A patient must never see clinical deliberation between doctors.
  if (session.role === "PATIENT") {
    consultation.messages = consultation.messages.filter((m) => !m.isInternal);
  }

  return NextResponse.json(consultation);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  const consultation = await db.consultation.findUnique({ where: { id } });
  if (!consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The GET above gates on participation but this handler did not, so any
  // authenticated user could post into any consultation they knew the id of.
  const isParticipant =
    consultation.patientId === session.id ||
    consultation.doctorId === session.id ||
    (session.role === "DOCTOR" && !consultation.doctorId);

  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Implicit claim: same check-then-update race as the dedicated claim route,
  // so it takes the same conditional-update treatment. Losing the race is not
  // an error here — it just means another doctor got there first and this
  // request proceeds as a non-owner.
  let claimed = false;
  if (session.role === "DOCTOR" && !consultation.doctorId) {
    const { count } = await db.consultation.updateMany({
      where: { id, doctorId: null },
      data: { doctorId: session.id, status: "ACTIVE" },
    });
    claimed = count > 0;
  }

  const message = await db.message.create({
    data: { consultationId: id, senderId: session.id, content },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  // Published after the write commits, so a subscriber that reacts by re-reading
  // cannot miss the row.
  await publish(id, { type: "message", data: message });

  if (consultation.status === "WAITING") {
    await db.consultation.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  // Status or ownership moved — viewers need the whole record, not a message.
  if (claimed || consultation.status === "WAITING") {
    await publish(id, { type: "sync" });
  }

  return NextResponse.json(message);
}
