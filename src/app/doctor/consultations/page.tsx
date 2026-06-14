import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Phone } from "lucide-react";
import { URGENCY_COLORS, STATUS_LABELS } from "@/lib/constants";

export default async function DoctorConsultationsPage() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  const consultations = await db.consultation.findMany({
    where: { OR: [{ doctorId: session.id }, { status: "WAITING" }] },
    include: {
      patient: { select: { name: true, town: true, phone: true } },
      doctor: { select: { name: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
      <p className="text-slate-500">{consultations.length} total · sorted by urgency</p>

      <div className="mt-6 space-y-3">
        {consultations.map((c) => (
          <Link key={c.id} href={`/doctor/consultations/${c.id}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{c.patient.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {c.patient.town}
                    {c.patient.phone && (
                      <><Phone className="h-3.5 w-3.5 ml-2" /> {c.patient.phone}</>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{c.chiefComplaint}</p>
                  {c.symptoms && <p className="mt-1 text-xs text-slate-500">{c.symptoms}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={URGENCY_COLORS[c.urgency as keyof typeof URGENCY_COLORS]}>{c.urgency}</Badge>
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
