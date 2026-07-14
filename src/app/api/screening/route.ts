import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session || session.role === "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const programs = await db.screeningProgram.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(programs);
}
