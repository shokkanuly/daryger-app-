import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q) {
      return NextResponse.json({ services: [], partners: [] });
    }

    // Search catalog services
    const services = await db.service.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { synonyms: { hasSome: [q] } },
        ],
      },
    });

    // Search partner clinics
    const partners = await db.clinic.findMany({
      where: {
        sourceType: "PARTNER",
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
    });

    return NextResponse.json({ services, partners });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to search" }, { status: 500 });
  }
}
