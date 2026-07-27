import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Open personnel-process anomalies — MedHub task 10. */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "HR_ANALYST" && session.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "OPEN";
  const anomalies = await db.hrAnomaly.findMany({
    where: { status },
    orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
  });

  return NextResponse.json(anomalies);
}
