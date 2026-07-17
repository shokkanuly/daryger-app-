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

  // Check if clinical AI trigger keywords are met
  const symptomText = (symptoms ?? "").toLowerCase();
  const answersText = answers ? JSON.stringify(answers).toLowerCase() : "";
  const combinedText = symptomText + " " + answersText;

  const triggerKeywords = [
    "hepatitis", "jaundice", "liver", "biliary", "cirrhosis", "hbsag", "alt", "ast", "ascites", "hbv",
    "желтуха", "печень", "гепатит", "цирроз", "алт", "аст", "водянка",
    "сары ауру", "бауыр", "өт", "қан құю"
  ];

  const isHepTrigger = triggerKeywords.some(keyword => combinedText.includes(keyword));

  let specialistRequired = false;
  let riskAssessment = null;

  if (isHepTrigger) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const assessRes = await fetch(`${baseUrl}/api/clinical/assess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ patientId: session.id, symptoms, answers }),
      });
      if (assessRes.ok) {
        riskAssessment = await assessRes.json();
        if (riskAssessment && riskAssessment.score >= 3.0) {
          specialistRequired = true;
        }
      }
    } catch (err) {
      console.error("Clinical AI assessment fetch failed during triage:", err);
    }
  }

  // Run Gemini AI triage analysis in parallel with DB operations
  let aiAnalysis: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const aiRes = await fetch(`${baseUrl}/api/triage/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ answers, symptoms }),
    });
    if (aiRes.ok) aiAnalysis = await aiRes.json();
  } catch {
    // Non-fatal
  }

  let availableDoctor = null;
  if (specialistRequired) {
    availableDoctor = await db.doctorProfile.findFirst({
      where: { isAvailable: true, specialty: "Hepatologist" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
  } else {
    availableDoctor = await db.doctorProfile.findFirst({
      where: { isAvailable: true },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
  }

  // Merge rule-based triage answers + AI analysis into triageData JSON
  const triageData = JSON.stringify({ answers, aiAnalysis });

  const consultation = await db.consultation.create({
    data: {
      patientId: session.id,
      doctorId: availableDoctor?.userId ?? null,
      status: availableDoctor ? "ACTIVE" : "WAITING",
      urgency,
      chiefComplaint,
      symptoms: symptoms || null,
      triageData,
      specialistRequired,
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
