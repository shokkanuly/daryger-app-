import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Calendar, Clock, ArrowRight } from "lucide-react";
import { URGENCY_COLORS, STATUS_LABELS } from "@/lib/constants";

export default async function PatientDashboard() {
  const session = await requireSession("PATIENT");
  if (!session) redirect("/login");

  const [consultations, appointments] = await Promise.all([
    db.consultation.findMany({
      where: { patientId: session.id },
      include: { doctor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.appointment.findMany({
      where: { patientId: session.id, status: "SCHEDULED" },
      include: { doctor: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 3,
    }),
  ]);

  return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Сәлеметсіз бе, {session.name.split(" ")[0]}!
          </h1>
          <p className="text-slate-500">
            {session.town && `${session.town} · `}How can we help you today?
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Link href="/patient/consult">
            <Card className="group cursor-pointer border-teal-200 bg-gradient-to-br from-teal-50 to-white transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">Get medical help</h3>
                  <p className="mt-1 text-sm text-slate-500">Start triage → connect with a regional doctor</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                    Start now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/patient/appointments">
            <Card className="group cursor-pointer transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Book appointment</h3>
                  <p className="mt-1 text-sm text-slate-500">Guaranteed priority slot at a regional clinic</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                    View slots <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {appointments.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Upcoming appointments</h2>
            <div className="space-y-3">
              {appointments.map((apt) => (
                <Card key={apt.id} padding className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{apt.doctor.name}</p>
                    <p className="text-sm text-slate-500">{apt.clinic}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-teal-700">{apt.date}</p>
                    <p className="text-sm text-slate-500">{apt.time}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent consultations</h2>
          {consultations.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No consultations yet. Start one when you need medical help.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <Link key={c.id} href={`/patient/consult/${c.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{c.chiefComplaint || "Consultation"}</p>
                        <p className="text-sm text-slate-500">
                          {c.doctor?.name || "Awaiting doctor"} · {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={URGENCY_COLORS[c.urgency as keyof typeof URGENCY_COLORS]}>{c.urgency}</Badge>
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
  );
}
