import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await db.matchQueueItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("Match queue fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch match queue" }, { status: 500 });
  }
}
