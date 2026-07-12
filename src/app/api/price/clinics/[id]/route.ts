import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prices = await db.priceRecord.findMany({
      where: { clinicId: id, isActive: true },
      include: { service: true },
      orderBy: { priceKzt: "asc" },
    });
    return NextResponse.json(prices);
  } catch (err: any) {
    console.error("Clinic price list error:", err);
    return NextResponse.json({ error: "Failed to fetch clinic prices" }, { status: 500 });
  }
}
