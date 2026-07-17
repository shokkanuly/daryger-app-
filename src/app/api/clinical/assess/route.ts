import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assessRisk } from "@/lib/clinical-ai/risk-model";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { patientId, symptoms, answers } = await req.json();
    const targetPatientId = patientId || session.id;

    // Fetch the patient details to check age/birthDate
    const patientUser = await db.user.findUnique({
      where: { id: targetPatientId },
      select: { birthDate: true },
    });

    const birthDate = patientUser?.birthDate || undefined;

    const result = await assessRisk(targetPatientId, {
      birthDate,
      symptoms,
      answers,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in clinical assess endpoint:", error);
    return NextResponse.json({ error: error.message || "Failed to assess risk" }, { status: 500 });
  }
}
