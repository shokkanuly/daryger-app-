import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Phone, Brain, AlertTriangle, ShieldAlert } from "lucide-react";
import { URGENCY_COLORS } from "@/lib/constants";
import ClaimButton from "./claim-button";

export default async function SpecialistReferralQueuePage() {
  const session = await requireSession("DOCTOR");
  if (!session) redirect("/login");

  // Fetch referrals (consultations needing specialist)
  const consultations = await db.consultation.findMany({
    where: {
      specialistRequired: true,
      status: "WAITING",
    },
    include: {
      patient: { select: { id: true, name: true, town: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch latest risk assessments for these patients
  const assessments = await db.riskAssessment.findMany({
    where: {
      patientId: { in: consultations.map((c) => c.patientId) },
      condition: "hepatitis-b",
    },
    orderBy: { computedAt: "desc" },
  });

  const assessmentMap = new Map<string, typeof assessments[0]>();
  for (const ass of assessments) {
    if (!assessmentMap.has(ass.patientId)) {
      assessmentMap.set(ass.patientId, ass);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/doctor"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600"
      >
        <ChevronLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Specialist Referral Queue
          </h1>
          <p className="text-slate-500">
            Patients identified with clinical risks needing specialist hepatology review
          </p>
        </div>
        <Badge className="bg-red-50 text-red-700 border-red-200 self-start md:self-auto text-sm px-3 py-1 font-semibold">
          {consultations.length} Pending Referrals
        </Badge>
      </div>

      {consultations.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50">
          <Brain className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No Pending Specialist Referrals</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            All referred patient consultations are currently claimed or resolved by specialists.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => {
            const risk = assessmentMap.get(c.patientId);
            const flags = risk ? JSON.parse(risk.flags as string) : [];

            return (
              <Card key={c.id} className="p-6 transition-all hover:shadow-md border-l-4 border-l-red-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-semibold text-lg text-slate-900">{c.patient.name}</p>
                      <Badge className={URGENCY_COLORS[c.urgency as keyof typeof URGENCY_COLORS]}>
                        {c.urgency}
                      </Badge>
                      {risk && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          Risk Score: {risk.score.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" /> {c.patient.town}
                      {c.patient.phone && (
                        <>
                          <Phone className="h-4 w-4 text-slate-400 ml-2" /> {c.patient.phone}
                        </>
                      )}
                    </p>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Chief Complaint
                      </p>
                      <p className="text-sm text-slate-800 font-medium mt-0.5">{c.chiefComplaint}</p>
                    </div>

                    {c.symptoms && (
                      <div className="mt-2.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Reported Symptoms
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5 bg-slate-50 p-2 rounded-lg italic">
                          "{c.symptoms}"
                        </p>
                      </div>
                    )}

                    {flags.length > 0 && (
                      <div className="mt-3.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Clinical Risk Factors Triggered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {flags.map((flag: any) => (
                            <span
                              key={flag.factorId}
                              className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-100 font-medium"
                              title={flag.description}
                            >
                              {flag.name} (+{flag.weight})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                    <ClaimButton consultationId={c.id} />
                    <Link href={`/doctor/consultations/${c.id}`} className="w-full">
                      <Button variant="outline" className="w-full text-slate-600">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
