import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

/**
 * Doctor-to-doctor teleconsilia — Track 3 «Телеконсилиум Врач-Врач».
 *
 * A GP asks a specialist about a case they keep. Unlike a referral this does
 * not move the patient, which is the point: it relieves the specialist centre
 * instead of redirecting load into it.
 */

/** Open teleconsilia, optionally filtered to a specialty a doctor covers. */
export async function GET(req: NextRequest) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const specialty = req.nextUrl.searchParams.get("specialty") ?? undefined;
  const mine = req.nextUrl.searchParams.get("mine") === "true";

  const consilia = await db.teleconsilium.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(specialty ? { specialty } : {}),
      ...(mine
        ? { OR: [{ requestedById: session.id }, { specialistId: session.id }] }
        : {}),
    },
    include: {
      consultation: {
        select: {
          id: true,
          urgency: true,
          chiefComplaint: true,
          symptoms: true,
          patient: { select: { id: true, name: true, town: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      specialist: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(consilia);
}

/** Requests a specialist opinion on a case. */
export async function POST(req: NextRequest) {
  const session = await requireSession("DOCTOR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { consultationId, specialty, question } = await req.json();

  if (!consultationId || !specialty || !question?.trim()) {
    return NextResponse.json(
      { error: "consultationId, specialty and question are required" },
      { status: 400 }
    );
  }

  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
  });
  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  // Only a doctor attached to the case may escalate it. An unclaimed case is
  // open to any doctor, matching how the consultation queue already works.
  if (consultation.doctorId && consultation.doctorId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await db.teleconsilium.create({
    data: {
      consultationId,
      requestedById: session.id,
      specialty,
      question: question.trim(),
    },
  });

  await logAction(session.id, "REQUEST_TELECONSILIUM", "Teleconsilium", created.id, {
    consultationId,
    specialty,
  });

  return NextResponse.json(created, { status: 201 });
}
