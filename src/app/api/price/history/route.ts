import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinicId");
    const serviceId = searchParams.get("serviceId");

    if (!clinicId || !serviceId) {
      return NextResponse.json(
        { error: "clinicId and serviceId are required" },
        { status: 400 }
      );
    }

    // Fetch all price records (active and archived) for this clinic+service combination
    const records = await db.priceRecord.findMany({
      where: {
        clinicId,
        serviceId,
      },
      orderBy: { parsedAt: "asc" },
    });

    // Deduplicate by date – keep one price per calendar day
    const seen = new Set<string>();
    const history = records
      .map((r) => ({
        date: r.parsedAt.toISOString().split("T")[0],
        priceKzt: Number(r.priceKzt),
        priceResidentKzt: r.priceResidentKzt ? Number(r.priceResidentKzt) : Number(r.priceKzt),
        priceNonresidentKzt: r.priceNonresidentKzt ? Number(r.priceNonresidentKzt) : null,
        isActive: r.isActive,
      }))
      .filter((h) => {
        if (seen.has(h.date)) return false;
        seen.add(h.date);
        return true;
      });

    return NextResponse.json(history);
  } catch (err: any) {
    console.error("Price history error:", err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
