import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession("PATIENT");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if patient has any completed consultation with approved followup
  const consultation = await db.consultation.findFirst({
    where: {
      patientId: session.id,
      followupApproved: true,
    },
  });

  return NextResponse.json({ approved: !!consultation });
}
