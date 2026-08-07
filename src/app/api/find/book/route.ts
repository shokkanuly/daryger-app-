import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

/**
 * Guest booking from the public directory — the pitch's "записаться за 3 минуты".
 *
 * A villager should not need an account to book a feldsher. Identity is captured
 * here as name + phone: a patient User is found-or-created keyed on the phone, so
 * repeat bookings from the same person reuse one record without ever setting a
 * password. This is a low-friction booking identity, not an authenticated login.
 */
class SlotTakenError extends Error {}

export async function POST(req: NextRequest) {
  const { profileId, slotId, patientName, patientPhone, telemedicine } = await req.json();

  if (!profileId || !slotId || !patientName?.trim() || !patientPhone?.trim()) {
    return NextResponse.json(
      { error: "Укажите имя, телефон и выберите время приёма" },
      { status: 400 }
    );
  }

  const profile = await db.doctorProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Специалист не найден" }, { status: 404 });
  }

  const slot = await db.timeSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.doctorId !== profileId) {
    return NextResponse.json({ error: "Это время недоступно" }, { status: 404 });
  }

  // Find-or-create the guest patient by phone. The synthetic email keeps the
  // unique constraint satisfied without asking for one; the random password
  // means the record cannot be logged into until the person chooses to register.
  const phone = patientPhone.trim();
  let patient = await db.user.findFirst({ where: { phone } });
  if (!patient) {
    patient = await db.user.create({
      data: {
        email: `guest.${phone.replace(/[^\d]/g, "")}@daryger.kz`,
        password: await bcrypt.hash(crypto.randomUUID(), 10),
        name: patientName.trim(),
        phone,
        role: "PATIENT",
        town: profile.town,
      },
    });
  }

  // Claim the slot and create the appointment as one unit, conditional on the
  // slot still being free — the same race-safe pattern the authenticated
  // booking route uses.
  let appointment;
  try {
    appointment = await db.$transaction(async (tx) => {
      const { count } = await tx.timeSlot.updateMany({
        where: { id: slotId, isBooked: false },
        data: { isBooked: true },
      });
      if (count === 0) throw new SlotTakenError();

      return tx.appointment.create({
        data: {
          patientId: patient!.id,
          doctorId: profile.user.id,
          date: slot.date,
          time: slot.time,
          type: "IN_PERSON",
          clinic: profile.clinic,
          notes: telemedicine
            ? "Телемедицина — приём дистанционно"
            : `Очный приём: ${profile.clinic}`,
        },
      });
    });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "Это время только что заняли. Выберите другое." },
        { status: 409 }
      );
    }
    throw err;
  }

  await logAction(patient.id, "GUEST_BOOK_APPOINTMENT", "Appointment", appointment.id, {
    profileId,
    town: profile.town,
    telemedicine: Boolean(telemedicine),
  });

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    provider: profile.user.name,
    clinic: profile.clinic,
    town: profile.town,
    date: slot.date,
    time: slot.time,
    telemedicine: Boolean(telemedicine),
  });
}
