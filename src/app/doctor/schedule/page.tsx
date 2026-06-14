import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";

export default async function DoctorSchedulePage() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");

  const [appointments, timeSlots, profile] = await Promise.all([
    db.appointment.findMany({
      where: { doctorId: session.id, status: "SCHEDULED" },
      include: { patient: { select: { name: true, town: true, phone: true } } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
    db.timeSlot.findMany({
      where: { doctor: { userId: session.id }, isBooked: false, date: { gte: today } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 20,
    }),
    db.doctorProfile.findUnique({ where: { userId: session.id } }),
  ]);

  const todayAppts = appointments.filter((a) => a.date === today);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
      <p className="text-slate-500">{profile?.clinic}</p>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Today&apos;s appointments</h2>
        {todayAppts.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No appointments scheduled for today.</p></Card>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((apt) => (
              <Card key={apt.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{apt.patient.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {apt.patient.town}
                    </p>
                    {apt.notes && <p className="text-xs text-slate-400 mt-1">{apt.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-teal-700 flex items-center gap-1 justify-end">
                      <Clock className="h-4 w-4" /> {apt.time}
                    </p>
                    <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-200">{apt.type.replace("_", " ")}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Upcoming appointments</h2>
        <div className="space-y-3">
          {appointments.filter((a) => a.date !== today).map((apt) => (
            <Card key={apt.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{apt.patient.name}</p>
                  <p className="text-sm text-slate-500">{apt.patient.town}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatDate(apt.date)}</p>
                  <p className="text-sm text-slate-500">{apt.time}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Available slots</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {timeSlots.map((slot) => (
            <div key={slot.id} className="rounded-lg border border-slate-200 p-2 text-center text-xs">
              <p className="font-medium">{formatDate(slot.date)}</p>
              <p className="text-slate-500">{slot.time}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
