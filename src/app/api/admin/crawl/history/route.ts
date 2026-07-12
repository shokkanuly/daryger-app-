import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Require admin session
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [captures, totalServices, totalPrices, unmatchedCount] = await Promise.all([
      db.rawCapture.findMany({
        orderBy: { fetchedAt: "desc" },
        take: 10,
        include: { clinic: true },
      }),
      db.service.count(),
      db.priceRecord.count(),
      db.matchQueueItem.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      captures,
      stats: {
        totalServices,
        totalPrices,
        unmatchedCount,
      },
    });
  } catch (err: any) {
    console.error("Crawl history fetch error:", err);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}
