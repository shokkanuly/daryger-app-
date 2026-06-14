import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateUrgency, getComplaintLabel } from "@/lib/triage";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const consultations = await db.consultation.findMany({
    where:
      session.role === "PATIENT"
        ? { patientId: session.id }
        : { OR: [{ doctorId: session.id }, { doctorId: null, status: "WAITING" as const }] },
    include: {
      patient: { select: { id: true, name: true, town: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(consultations);
}

export async function POST(req: NextRequest) {
  const session = await requireSession("PATIENT");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answers, symptoms } = await req.json();
  const urgency = calculateUrgency(answers);
  const chiefComplaint = getComplaintLabel(answers.chief_complaint);

  const availableDoctor = await db.doctorProfile.findFirst({
    where: { isAvailable: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const consultation = await db.consultation.create({
    data: {
      patientId: session.id,
      doctorId: availableDoctor?.userId ?? null,
      status: availableDoctor ? "ACTIVE" : "WAITING",
      urgency,
      chiefComplaint,
      symptoms: symptoms || null,
      triageData: JSON.stringify(answers),
    },
  });

  if (availableDoctor) {
    await db.message.create({
      data: {
        consultationId: consultation.id,
        senderId: availableDoctor.userId,
        content: `Hello ${session.name.split(" ")[0]}, I'm ${availableDoctor.user.name}. I've reviewed your triage information. How can I help you today?`,
      },
    });
  }

  return NextResponse.json({
    consultation,
    doctor: availableDoctor
      ? { name: availableDoctor.user.name, specialty: availableDoctor.specialty, clinic: availableDoctor.clinic }
      : null,
  });
}
