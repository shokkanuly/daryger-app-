import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Calendar, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { URGENCY_COLORS, STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export default async function DoctorDashboard() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");

  const [waitingCount, referralCount, todayAppointments, recentConsultations, profile] = await Promise.all([
    db.consultation.count({ where: { status: "WAITING", specialistRequired: false } }),
    db.consultation.count({ where: { status: "WAITING", specialistRequired: true } }),
    db.appointment.count({ where: { doctorId: session.id, date: today, status: "SCHEDULED" } }),
    db.consultation.findMany({
      where: { OR: [{ doctorId: session.id }, { status: "WAITING" }] },
      include: {
        patient: { select: { name: true, town: true, phone: true } },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
      take: 5,
    }),
    db.doctorProfile.findUnique({ where: { userId: session.id } }),
  ]);

  const activeCount = recentConsultations.filter((c) => c.status === "ACTIVE").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-slate-500">
          {profile?.specialty} · {profile?.clinic}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { icon: MessageCircle, label: "Waiting queue", value: waitingCount, color: "text-orange-600 bg-orange-50", href: "/doctor/consultations" },
          { icon: ShieldAlert, label: "Specialist referrals", value: referralCount, color: "text-red-600 bg-red-50", href: "/doctor/consults" },
          { icon: Users, label: "Active consultations", value: activeCount, color: "text-teal-600 bg-teal-50", href: "/doctor/consultations" },
          { icon: Calendar, label: "Today's appointments", value: todayAppointments, color: "text-blue-600 bg-blue-50", href: "/doctor/schedule" },
        ].map(({ icon: Icon, label, value, color, href }) => (
          <Link key={label} href={href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Consultation queue</h2>
          <Link href="/doctor/consultations" className="text-sm text-teal-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentConsultations.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No pending consultations.</p></Card>
        ) : (
          <div className="space-y-3">
            {recentConsultations.map((c) => (
              <Link key={c.id} href={`/doctor/consultations/${c.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{c.patient.name}</p>
                      <p className="text-sm text-slate-500">
                        {c.patient.town} · {c.chiefComplaint}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={URGENCY_COLORS[c.urgency as keyof typeof URGENCY_COLORS]}>{c.urgency}</Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]}
                      </Badge>
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
