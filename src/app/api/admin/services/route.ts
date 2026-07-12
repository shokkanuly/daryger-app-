import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET standard services (accessible by patient and system_admin)
export async function GET() {
  try {
    const list = await db.service.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(list);
  } catch (err: any) {
    console.error("Fetch standard services error:", err);
    return NextResponse.json({ error: "Failed to load services" }, { status: 500 });
  }
}

// POST standard services (SYSTEM_ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, synonyms, category, icdCode } = await req.json();

    if (!name || !category) {
      return NextResponse.json({ error: "Name and Category are required" }, { status: 400 });
    }

    const service = await db.service.create({
      data: {
        name,
        synonyms: synonyms || [],
        category,
        icdCode,
        isActive: true,
      },
    });

    return NextResponse.json(service);
  } catch (err: any) {
    console.error("Create standard service error:", err);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
