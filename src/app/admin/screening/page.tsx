"use client";

import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  Send, 
  CheckCircle, 
  Users, 
  Play, 
  FileSpreadsheet, 
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ScreeningProgram {
  id: string;
  name: string;
  criteria: any;
}

interface CoverageStats {
  programName: string;
  cohortSize: number;
  invitedCount: number;
  respondedCount: number;
  completedCount: number;
  percentages: {
    invited: number;
    responded: number;
    completed: number;
  };
}

export default function ScreeningPage() {
  const [programs, setPrograms] = useState<ScreeningProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ScreeningProgram | null>(null);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch all programs
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      // For simplicity, we can fetch all programs from standard API or write a query.
      // We will fetch programs from our database. Let's query them.
      const res = await fetch("/api/services"); // wait, let's verify if there is an endpoint.
      // Let's create an endpoint or just fetch directly. Wait, we can fetch all programs from a GET endpoint /api/screening/programs if it exists, or just query it in a route. Let's make sure we fetch it or write a simple route.
      // Wait, let's see if we should fetch from `/api/screening/invite` or write a separate program listing endpoint.
      // Let's create a quick API GET handler in `src/app/api/screening/route.ts` that lists all ScreeningPrograms. That will make this page work perfectly!
      const programsRes = await fetch("/api/screening");
      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data);
        if (data.length > 0) {
          setSelectedProgram(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load programs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats for the selected program
  const fetchStats = async (programId: string) => {
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/screening/${programId}/coverage`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch program coverage statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetchStats(selectedProgram.id);
      setFeedback(null);
    }
  }, [selectedProgram]);

  const handleTriggerInvite = async () => {
    if (!selectedProgram) return;
    try {
      setTriggering(true);
      setFeedback("Assembling cohort and building outreach invites...");
      const res = await fetch("/api/screening/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgram.id,
          channel: "SMS",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || "Invites sent successfully.");
        fetchStats(selectedProgram.id);
      } else {
        setFeedback(`Error: ${data.error || "failed to send invites"}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message || err}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-teal-600 animate-pulse" /> Screening & Outreach Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Define target cohorts, send screening program invitations, and track patient coverage rates.
          </p>
        </header>

        {loading ? (
          <p className="text-center text-slate-500 py-12">Loading screening programs...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Sidebar list of programs */}
            <section className="md:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-600" /> Active Programs
              </h2>
              {programs.length === 0 ? (
                <Card className="p-4 text-center text-slate-400">No active screening programs.</Card>
              ) : (
                programs.map((p) => {
                  const isSelected = selectedProgram?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProgram(p)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected 
                          ? "border-teal-600 bg-teal-50/10 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900">{p.name}</h3>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p>Min Age: {p.criteria.minAge || "Any"}</p>
                        <p>Cities: {p.criteria.city?.join(", ") || "All"}</p>
                        <p>Last Screened Before: {p.criteria.lastScreenedBefore || "N/A"}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Coverage Statistics & Invitation Trigger */}
            <section className="md:col-span-2 space-y-6">
              {selectedProgram && stats ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { icon: Users, label: "Cohort Size", value: stats.cohortSize, color: "text-slate-600 bg-slate-100" },
                      { icon: Send, label: "Invited Patients", value: stats.invitedCount, color: "text-teal-600 bg-teal-50" },
                      { icon: CheckCircle, label: "Completed Screenings", value: stats.completedCount, color: "text-indigo-600 bg-indigo-50" }
                    ].map(({ icon: Icon, label, value, color }) => (
                      <Card key={label} className="p-4 flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{value}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Coverage Progress Dashboard */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
                      Outreach Coverage Statistics
                    </h2>

                    {statsLoading ? (
                      <p className="text-center text-slate-400 py-6">Recalculating statistics...</p>
                    ) : (
                      <div className="space-y-6">
                        {[
                          { label: "Invitation Dispatched Rate", pct: stats.percentages.invited, color: "bg-teal-600" },
                          { label: "Patient Response Rate", pct: stats.percentages.responded, color: "bg-orange-500" },
                          { label: "Clinical Completion Rate", pct: stats.percentages.completed, color: "bg-indigo-600" }
                        ].map(({ label, pct, color }) => (
                          <div key={label} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-slate-700">{label}</span>
                              <span className="font-bold text-slate-900">{pct}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trigger Campaign panel */}
                  <div className="rounded-2xl border border-slate-200 bg-teal-50/10 p-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Play className="h-4 w-4 text-teal-600" /> Start Outreach Campaign
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Assembles the patient cohort dynamically based on the program criteria and sends SMS checkup invitations.
                    </p>
                    <div className="mt-4 flex flex-col gap-4">
                      <Button
                        onClick={handleTriggerInvite}
                        disabled={triggering || stats.cohortSize === 0}
                        className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 w-fit"
                      >
                        <Send className="h-4 w-4" /> Trigger Outreach via SMS
                      </Button>
                      {feedback && (
                        <div className="rounded-xl border border-teal-100 bg-teal-50/20 p-4 text-xs text-teal-800 font-medium">
                          {feedback}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
                  <ShieldAlert className="h-8 w-8 text-slate-300 animate-bounce" />
                  <p className="mt-2 text-sm text-slate-500">Please select or seed a program to analyze coverage.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
