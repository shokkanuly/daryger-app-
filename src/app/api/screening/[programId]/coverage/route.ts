import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCohort } from "@/lib/screening/cohort-builder";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await requireSession();
  if (!session || session.role === "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { programId } = await params;
  const program = await db.screeningProgram.findUnique({
    where: { id: programId },
  });

  if (!program) {
    return NextResponse.json({ error: "Screening program not found" }, { status: 404 });
  }

  // 1. Calculate cohort size
  const cohort = await buildCohort(program);
  const cohortSize = cohort.length;

  // 2. Count statuses in DB
  const invitedCount = await db.screeningInvite.count({
    where: { programId, status: { in: ["SENT", "DELIVERED", "RESPONDED", "COMPLETED"] } },
  });

  const respondedCount = await db.screeningInvite.count({
    where: { programId, status: { in: ["RESPONDED", "COMPLETED"] } },
  });

  const completedCount = await db.screeningInvite.count({
    where: { programId, status: "COMPLETED" },
  });

  // Calculate percentages
  const invitedPct = cohortSize > 0 ? Math.round((invitedCount / cohortSize) * 100) : 0;
  const respondedPct = cohortSize > 0 ? Math.round((respondedCount / cohortSize) * 100) : 0;
  const completedPct = cohortSize > 0 ? Math.round((completedCount / cohortSize) * 100) : 0;

  return NextResponse.json({
    programName: program.name,
    cohortSize,
    invitedCount,
    respondedCount,
    completedCount,
    percentages: {
      invited: Math.min(invitedPct, 100),
      responded: Math.min(respondedPct, 100),
      completed: Math.min(completedPct, 100),
    },
  });
}
