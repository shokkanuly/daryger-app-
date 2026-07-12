import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ScheduleCalendarClient from "./ScheduleCalendarClient";

export default async function DoctorSchedulePage() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  const [appointments, timeSlots, profile] = await Promise.all([
    db.appointment.findMany({
      where: { doctorId: session.id, status: "SCHEDULED" },
      include: { patient: { select: { name: true, town: true, phone: true } } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
    db.timeSlot.findMany({
      where: { doctor: { userId: session.id }, isBooked: false },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 200,
    }),
    db.doctorProfile.findUnique({ where: { userId: session.id } }),
  ]);

  // Convert database models to plain JSON-serializable structures
  const serializedAppointments = appointments.map((apt) => ({
    id: apt.id,
    patientId: apt.patientId,
    doctorId: apt.doctorId,
    date: apt.date,
    time: apt.time,
    type: apt.type,
    clinic: apt.clinic,
    notes: apt.notes,
    status: apt.status,
    patient: {
      name: apt.patient.name,
      town: apt.patient.town,
      phone: apt.patient.phone,
    },
  }));

  const serializedTimeSlots = timeSlots.map((ts) => ({
    id: ts.id,
    date: ts.date,
    time: ts.time,
    isBooked: ts.isBooked,
  }));

  const serializedProfile = profile ? {
    clinic: profile.clinic,
    region: profile.region,
  } : null;

  return (
    <ScheduleCalendarClient 
      appointments={serializedAppointments} 
      timeSlots={serializedTimeSlots} 
      profile={serializedProfile} 
    />
  );
}
