import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: serviceId } = await params;
    const records = await db.priceRecord.findMany({
      where: {
        serviceId,
        isActive: true,
        clinic: {
          sourceType: "PARTNER",
        },
      },
      include: {
        clinic: true,
      },
      orderBy: {
        priceKzt: "asc",
      },
    });

    return NextResponse.json(records);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch partners" }, { status: 500 });
  }
}
