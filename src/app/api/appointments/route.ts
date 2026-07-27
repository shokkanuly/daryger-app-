import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

/** Thrown inside the booking transaction when another patient wins the slot. */
class SlotTakenError extends Error {}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "PATIENT" ? { patientId: session.id } : { doctorId: session.id };

  const appointments = await db.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, town: true, phone: true } },
      doctor: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await requireSession("PATIENT");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Validate doctor verification (referral)
  const approvedReferral = await db.consultation.findFirst({
    where: {
      patientId: session.id,
      followupApproved: true,
    },
  });
  if (!approvedReferral) {
    return NextResponse.json({ error: "Booking requires doctor approval referral" }, { status: 403 });
  }

  const { doctorId, date, time, type, clinic, notes } = await req.json();

  const slot = await db.timeSlot.findFirst({
    where: { doctor: { userId: doctorId }, date, time, isBooked: false },
  });

  if (!slot) {
    // Previously the appointment was created regardless, producing bookings
    // backed by no slot at all — double-booked doctors with no way to detect it.
    return NextResponse.json(
      { error: "That time slot is not available" },
      { status: 409 }
    );
  }

  const doctorProfile = await db.doctorProfile.findUnique({ where: { userId: doctorId } });

  // Claim the slot and create the appointment as one unit.
  //
  // The claim is conditional on the slot still being free: two patients booking
  // the same slot concurrently both pass the findFirst above, and only the one
  // whose updateMany reports a row wins. Wrapping both statements in a
  // transaction means a failed insert rolls the claim back instead of leaving
  // the slot marked booked with no appointment behind it.
  let appointment;
  try {
    appointment = await db.$transaction(async (tx) => {
      const { count } = await tx.timeSlot.updateMany({
        where: { id: slot.id, isBooked: false },
        data: { isBooked: true },
      });
      if (count === 0) throw new SlotTakenError();

      return tx.appointment.create({
        data: {
          patientId: session.id,
          doctorId,
          date,
          time,
          type: type || "IN_PERSON",
          clinic: clinic || doctorProfile?.clinic,
          notes,
        },
        include: {
          doctor: { select: { name: true } },
        },
      });
    });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "That time slot was just taken" },
        { status: 409 }
      );
    }
    throw err;
  }

  await logAction(
    session.id,
    "BOOK_APPOINTMENT",
    "Appointment",
    appointment.id,
    { doctorId, date, time, type, clinic }
  );

  return NextResponse.json(appointment);
}

