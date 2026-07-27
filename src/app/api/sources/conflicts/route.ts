import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Fields where source systems disagree about the same subject. */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "OPEN";

  const conflicts = await db.recordConflict.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(conflicts);
}
