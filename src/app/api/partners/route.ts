import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const status = searchParams.get("status");

    const partners = await db.clinic.findMany({
      where: {
        sourceType: "PARTNER",
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
        ...(status ? { isActive: status === "active" } : {}),
      },
    });

    return NextResponse.json(partners);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list partners" }, { status: 500 });
  }
}
