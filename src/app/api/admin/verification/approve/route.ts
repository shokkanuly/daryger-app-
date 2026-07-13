import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("SYSTEM_ADMIN");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceRecordId, serviceId } = await req.json();
    if (!priceRecordId) {
      return NextResponse.json({ error: "priceRecordId is required" }, { status: 400 });
    }

    const record = await db.priceRecord.findUnique({
      where: { id: priceRecordId },
    });

    if (!record) {
      return NextResponse.json({ error: "Price record not found" }, { status: 404 });
    }

    // Update PriceRecord status to verified
    await db.priceRecord.update({
      where: { id: priceRecordId },
      data: {
        isVerified: true,
        verificationNote: "Manually verified by admin",
        ...(serviceId ? { serviceId } : {}),
      },
    });

    // Update any matching queue item if it exists
    const queueItem = await db.matchQueueItem.findFirst({
      where: { sourceRecordId: priceRecordId },
    });
    if (queueItem) {
      await db.matchQueueItem.update({
        where: { id: queueItem.id },
        data: {
          status: "APPROVED",
          suggestedServiceId: serviceId || record.serviceId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to approve verification item:", err);
    return NextResponse.json({ error: err.message || "Failed to approve verification item" }, { status: 500 });
  }
}
