import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";

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

  if (slot) {
    await db.timeSlot.update({ where: { id: slot.id }, data: { isBooked: true } });
  }

  const doctorProfile = await db.doctorProfile.findUnique({ where: { userId: doctorId } });

  const appointment = await db.appointment.create({
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

  await logAction(
    session.id,
    "BOOK_APPOINTMENT",
    "Appointment",
    appointment.id,
    { doctorId, date, time, type, clinic }
  );

  return NextResponse.json(appointment);
}

