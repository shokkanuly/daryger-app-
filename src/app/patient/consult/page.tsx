"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TRIAGE_QUESTIONS } from "@/lib/triage";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Stethoscope } from "lucide-react";

export default function TriagePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [routing, setRouting] = useState(false);

  const question = TRIAGE_QUESTIONS[step];
  const isLast = step === TRIAGE_QUESTIONS.length;
  const progress = ((step) / (TRIAGE_QUESTIONS.length + 1)) * 100;

  async function handleSubmit() {
    setLoading(true);
    setRouting(true);
    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, symptoms }),
    });
    const data = await res.json();
    if (res.ok) {
      await new Promise((r) => setTimeout(r, 1500));
      router.push(`/patient/consult/${data.consultation.id}`);
    }
    setLoading(false);
  }

  if (routing) {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Regional routing in progress</h2>
          <p className="mt-2 text-slate-500">Connecting you to an available doctor in the Karaganda region...</p>
          <div className="mt-6 flex items-center gap-2 text-sm text-teal-600">
            <MapPin className="h-4 w-4" />
            Searching regional network
          </div>
        </div>
    );
  }

  return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link href="/patient" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>Automated triage</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!isLast ? (
          <Card>
            <CardHeader>
              <CardTitle>{question.question}</CardTitle>
              <CardDescription>{question.questionKk}</CardDescription>
            </CardHeader>
            <div className="space-y-2">
              {question.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setAnswers({ ...answers, [question.id]: opt.value });
                    setTimeout(() => setStep(step + 1), 200);
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    answers[question.id] === opt.value
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-medium text-slate-900">{opt.label}</p>
                  <p className="text-sm text-slate-500">{opt.labelKk}</p>
                </button>
              ))}
            </div>
            {step > 0 && (
              <Button variant="ghost" className="mt-4" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Describe your symptoms</CardTitle>
              <CardDescription>Tell the doctor more details (optional but helpful)</CardDescription>
            </CardHeader>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              placeholder="e.g. Fever 37.8°C since yesterday, sore throat, no breathing difficulty..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    Connect to doctor <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-teal-50 p-3 text-xs text-teal-800">
          <Stethoscope className="h-4 w-4 shrink-0" />
          Your answers help route you to the right doctor and prioritize urgent cases.
        </div>
      </main>
  );
}
