import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partnerId } = await params;
    const records = await db.priceRecord.findMany({
      where: {
        clinicId: partnerId,
        isActive: true,
      },
      include: {
        service: true,
      },
      orderBy: {
        priceKzt: "asc",
      },
    });

    return NextResponse.json(records);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch service prices" }, { status: 500 });
  }
}
