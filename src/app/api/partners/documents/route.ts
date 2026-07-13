import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docs = await db.priceDocument.findMany({
      take: 20,
      orderBy: { parsedAt: "desc" },
      include: {
        clinic: true,
      },
    });

    return NextResponse.json(docs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list documents" }, { status: 500 });
  }
}
