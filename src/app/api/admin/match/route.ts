import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { matchQueueItemId, status, serviceId } = await req.json();

    if (!matchQueueItemId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const item = await db.matchQueueItem.findUnique({
      where: { id: matchQueueItemId },
    });

    if (!item) {
      return NextResponse.json({ error: "Match queue item not found" }, { status: 404 });
    }

    if (status === "APPROVED") {
      if (!serviceId) {
        return NextResponse.json({ error: "serviceId required to approve mapping" }, { status: 400 });
      }

      // Update the price record to relate it to standard service
      await db.priceRecord.update({
        where: { id: item.sourceRecordId },
        data: { serviceId },
      });

      // Update queue item
      await db.matchQueueItem.update({
        where: { id: matchQueueItemId },
        data: { status: "APPROVED", suggestedServiceId: serviceId },
      });
    } else if (status === "REJECTED") {
      await db.matchQueueItem.update({
        where: { id: matchQueueItemId },
        data: { status: "REJECTED" },
      });
    } else {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Match resolution error:", err);
    return NextResponse.json({ error: "Failed to resolve match" }, { status: 500 });
  }
}
