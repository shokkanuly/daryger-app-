import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await db.priceRecord.findMany({
      where: {
        isVerified: false,
        isActive: true,
      },
      include: {
        clinic: true,
        sourceDoc: true,
      },
      orderBy: {
        parsedAt: "desc",
      },
    });

    return NextResponse.json(records);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list pending verifications" }, { status: 500 });
  }
}
