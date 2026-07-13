import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const services = await db.service.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
    });
    return NextResponse.json(services);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list services" }, { status: 500 });
  }
}
