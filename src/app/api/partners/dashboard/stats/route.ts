import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalDocuments,
      pendingDocuments,
      totalRecords,
      verifiedRecords,
      pendingQueueItems
    ] = await Promise.all([
      db.priceDocument.count(),
      db.priceDocument.count({
        where: {
          parseStatus: { in: ["PENDING", "PROCESSING"] }
        }
      }),
      db.priceRecord.count({
        where: { isActive: true }
      }),
      db.priceRecord.count({
        where: { isActive: true, isVerified: true }
      }),
      db.matchQueueItem.count({
        where: { status: "PENDING" }
      })
    ]);

    const normalizationRate = totalRecords > 0 
      ? Math.round((verifiedRecords / totalRecords) * 100) 
      : 100;

    return NextResponse.json({
      totalDocuments,
      pendingDocuments,
      totalRecords,
      verifiedRecords,
      normalizationRate,
      pendingQueueItems,
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch stats" }, { status: 500 });
  }
}
