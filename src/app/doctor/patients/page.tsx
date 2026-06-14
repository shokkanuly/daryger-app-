import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Phone, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DoctorPatientsPage() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  const consultations = await db.consultation.findMany({
    where: { doctorId: session.id },
    include: {
      patient: { select: { id: true, name: true, town: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const patientMap = new Map<string, {
    patient: { id: string; name: string; town: string | null; phone: string | null };
    consultations: typeof consultations;
  }>();

  for (const c of consultations) {
    const existing = patientMap.get(c.patientId);
    if (existing) {
      existing.consultations.push(c);
    } else {
      patientMap.set(c.patientId, { patient: c.patient, consultations: [c] });
    }
  }

  const patients = Array.from(patientMap.values());

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/doctor" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
      <p className="text-slate-500">{patients.length} patients in your care</p>

      <div className="mt-6 space-y-4">
        {patients.map(({ patient, consultations: history }) => (
          <Card key={patient.id}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-slate-900">{patient.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> {patient.town}
                  {patient.phone && <><Phone className="h-3.5 w-3.5" /> {patient.phone}</>}
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                {history.length} visit{history.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {history.map((c) => (
                <Link key={c.id} href={`/doctor/consultations/${c.id}`} className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{c.chiefComplaint}</p>
                      <p className="text-xs text-slate-500">{formatDate(c.createdAt.toISOString().split("T")[0])}</p>
                    </div>
                  </div>
                  {c.diagnosis && <p className="text-xs text-teal-700 max-w-[200px] truncate">{c.diagnosis}</p>}
                </Link>
              ))}
            </div>
          </Card>
        ))}

        {patients.length === 0 && (
          <Card><p className="text-sm text-slate-500">No patients yet. Accept consultations from the queue.</p></Card>
        )}
      </div>
    </main>
  );
}
