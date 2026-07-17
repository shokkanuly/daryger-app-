import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;

  // Let patients view their own history, and doctors/admins view any history
  const canAccess =
    session.role === "DOCTOR" ||
    session.role === "SYSTEM_ADMIN" ||
    session.id === patientId;

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const assessments = await db.riskAssessment.findMany({
      where: { patientId },
      orderBy: { computedAt: "desc" },
    });

    // Parse the flags JSON string back to arrays
    const formatted = assessments.map((a) => ({
      ...a,
      flags: typeof a.flags === "string" ? JSON.parse(a.flags) : a.flags,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching patient assessments:", error);
    return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
  }
}
