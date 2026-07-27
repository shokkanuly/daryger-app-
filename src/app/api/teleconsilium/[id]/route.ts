import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { publish } from "@/lib/realtime";

/**
 * Claim a teleconsilium, or record the specialist's opinion.
 *
 * action: "claim"    — a specialist picks up an open request
 * action: "complete" — the specialist files their opinion and closes it
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, opinion } = await req.json();

  const existing = await db.teleconsilium.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "claim") {
    // Conditional claim, same treatment as consultations: two specialists
    // opening the queue at once must not both believe they own this.
    const { count } = await db.teleconsilium.updateMany({
      where: { id, specialistId: null, status: "REQUESTED" },
      data: { specialistId: session.id, status: "ACTIVE", claimedAt: new Date() },
    });

    if (count === 0) {
      const current = await db.teleconsilium.findUnique({ where: { id } });
      if (current?.specialistId === session.id) return NextResponse.json(current);
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }

    await logAction(session.id, "CLAIM_TELECONSILIUM", "Teleconsilium", id, {});
    // Viewers of the underlying case should see the status change.
    await publish(existing.consultationId, { type: "sync" });

    return NextResponse.json(await db.teleconsilium.findUnique({ where: { id } }));
  }

  if (action === "complete") {
    if (existing.specialistId !== session.id) {
      return NextResponse.json(
        { error: "Only the specialist who claimed this may complete it" },
        { status: 403 }
      );
    }
    if (!opinion?.trim()) {
      return NextResponse.json({ error: "opinion is required" }, { status: 400 });
    }

    const updated = await db.teleconsilium.update({
      where: { id },
      data: {
        opinion: opinion.trim(),
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // The opinion is also written into the case as an internal message, so the
    // requesting doctor sees it in the thread rather than only on this record.
    await db.message.create({
      data: {
        consultationId: existing.consultationId,
        senderId: session.id,
        content: `Заключение консультанта (${existing.specialty}): ${opinion.trim()}`,
        isInternal: true,
      },
    });

    await logAction(session.id, "COMPLETE_TELECONSILIUM", "Teleconsilium", id, {});
    await publish(existing.consultationId, { type: "sync" });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
