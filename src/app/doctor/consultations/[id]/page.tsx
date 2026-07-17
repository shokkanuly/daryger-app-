"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Send, MapPin, Phone, CheckCircle,
  Video, VideoOff, Download, Brain, AlertTriangle, Loader2,
} from "lucide-react";
import { URGENCY_COLORS } from "@/lib/constants";
import { useTranslation } from "@/lib/language-context";
import { downloadPrescriptionPDF } from "@/lib/prescription-pdf";

interface Message {
  id: string;
  content: string;
  sender: { id: string; name: string; role: string };
}

interface AiAnalysis {
  urgency: string;
  concerns: string[];
  specialist: string;
  summary: string;
}

interface Consultation {
  id: string;
  status: string;
  urgency: string;
  chiefComplaint: string | null;
  symptoms: string | null;
  triageData: string | null;
  diagnosis: string | null;
  prescription: string | null;
  videoRoomUrl: string | null;
  patient: { name: string; town: string | null; phone: string | null };
  doctor: { id: string; name: string } | null;
  messages: Message[];
}

export default function DoctorConsultChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [message, setMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [completing, setCompleting] = useState(false);
  const [followupApproved, setFollowupApproved] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parse AI analysis from triageData JSON
  const aiAnalysis: AiAnalysis | null = (() => {
    if (!consultation?.triageData) return null;
    try {
      const parsed = JSON.parse(consultation.triageData);
      return parsed.aiAnalysis ?? null;
    } catch {
      return null;
    }
  })();

  async function loadExplanation(score: number, flags: any) {
    setExplaining(true);
    try {
      const res = await fetch("/api/clinical/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, flags }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  }

  async function load() {
    const res = await fetch(`/api/consultations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConsultation(data);
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.prescription) setPrescription(data.prescription);
      if (data.followupApproved) setFollowupApproved(data.followupApproved);
    }
  }

  useEffect(() => {
    if (consultation?.patient?.id) {
      fetch(`/api/clinical/assessments/${consultation.patient.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            setAssessment(data[0]);
            loadExplanation(data[0].score, data[0].flags);
          }
        })
        .catch((err) => console.error("Failed to load assessments:", err));
    }
  }, [consultation?.patient?.id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consultation?.messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await fetch(`/api/consultations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    setMessage("");
    await load();
  }

  async function completeConsultation() {
    setCompleting(true);
    await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", diagnosis, prescription, followupApproved }),
    });
    router.push("/doctor");
    router.refresh();
    setCompleting(false);
  }

  async function startVideo() {
    setVideoLoading(true);
    setVideoError(false);
    try {
      const res = await fetch("/api/video/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: id }),
      });
      const data = await res.json();
      setVideoUrl(data.roomUrl);
      setVideoOpen(true);
      // Notify the patient via chat message
      await fetch(`/api/consultations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `📹 Video consultation started. Join here: ${data.roomUrl}`,
        }),
      });
      await load();
    } catch {
      setVideoError(true);
    } finally {
      setVideoLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!consultation) return;
    await downloadPrescriptionPDF({
      consultationId: consultation.id,
      patientName: consultation.patient.name,
      patientTown: consultation.patient.town,
      doctorName: consultation.doctor?.name ?? "Daryger Doctor",
      doctorLicense: null,
      clinic: "Daryger Telemedicine",
      chiefComplaint: consultation.chiefComplaint,
      diagnosis: diagnosis || consultation.diagnosis || "",
      prescription: prescription || consultation.prescription || "",
      date: new Date().toLocaleDateString("en-GB"),
    });
  }

  if (!consultation) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">{t("chat.loading")}</div>;
  }

  const statusLabel: Record<string, string> = {
    TRIAGE: t("status.TRIAGE"),
    WAITING: t("status.WAITING"),
    ACTIVE: t("status.ACTIVE"),
    COMPLETED: t("status.COMPLETED"),
    CANCELLED: t("status.CANCELLED"),
  };

  const urgencyColor: Record<string, string> = {
    LOW: "text-emerald-700 bg-emerald-50",
    MEDIUM: "text-amber-700 bg-amber-50",
    HIGH: "text-orange-700 bg-orange-50",
    EMERGENCY: "text-red-700 bg-red-50",
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/doctor/consultations" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> {t("chat.backToQueue")}
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Chat panel ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
          <Card className="mb-4 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{consultation.patient.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> {consultation.patient.town}
                  {consultation.patient.phone && (
                    <><Phone className="h-3.5 w-3.5" /> {consultation.patient.phone}</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge className={URGENCY_COLORS[consultation.urgency as keyof typeof URGENCY_COLORS]}>
                  {consultation.urgency}
                </Badge>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {statusLabel[consultation.status]}
                </Badge>
                {consultation.status !== "COMPLETED" && (
                  <button
                    id="start-video-btn"
                    onClick={startVideo}
                    disabled={videoLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
                  >
                    {videoLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Video className="h-3.5 w-3.5" />}
                    {t("chat.startVideo")}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm font-medium">{consultation.chiefComplaint}</p>
            {consultation.symptoms && <p className="text-xs text-slate-500 mt-1">{consultation.symptoms}</p>}
          </Card>

          {/* Video fallback banner */}
          {videoError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shrink-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("chat.videoFallback")}
            </div>
          )}

          {/* Daily.co iframe */}
          {videoOpen && videoUrl && (
            <div className="mb-4 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-teal-600" /> Video Consultation
                </span>
                <button
                  onClick={() => setVideoOpen(false)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500"
                >
                  <VideoOff className="h-3.5 w-3.5" /> Close
                </button>
              </div>
              <iframe
                src={videoUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture"
                className="w-full rounded-xl border border-slate-200"
                style={{ height: "300px" }}
                onError={() => { setVideoOpen(false); setVideoError(true); }}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            {consultation.messages.map((msg) => {
              const isDoctor = msg.sender.role === "DOCTOR";
              return (
                <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isDoctor ? "bg-teal-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"
                  }`}>
                    {!isDoctor && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>}
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {consultation.status !== "COMPLETED" && (
            <form onSubmit={sendMessage} className="mt-4 flex gap-2 shrink-0">
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("chat.replyPlaceholder")} className="flex-1" />
              <Button type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* AI Triage Insights — doctor-only view */}
          {aiAnalysis && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-violet-500" />
                {t("chat.aiInsights")}
                <span className="ml-auto text-xs font-normal text-slate-400">Gemini 2.5</span>
              </h3>
              <div className="space-y-2">
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${urgencyColor[aiAnalysis.urgency] ?? "text-slate-700 bg-slate-50"}`}>
                  {t("chat.aiUrgency")}: {aiAnalysis.urgency}
                </div>
                {aiAnalysis.summary && (
                  <p className="text-xs text-slate-600 leading-relaxed">{aiAnalysis.summary}</p>
                )}
                {aiAnalysis.concerns?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{t("chat.aiConcerns")}:</p>
                    <ul className="space-y-1">
                      {aiAnalysis.concerns.map((c, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.specialist && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">{t("chat.aiSpecialist")}:</span> {aiAnalysis.specialist}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Clinical Risk Assessment Panel */}
          {assessment && (
            <Card className="border-red-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-red-500" />
                Клиническая оценка риска
                <span className="ml-auto text-xs font-normal text-slate-400">{assessment.modelVersion}</span>
              </h3>
              <div className="space-y-3">
                <div className={`rounded-lg px-3 py-2 text-sm font-semibold border ${
                  assessment.score >= 3.0 ? "text-red-700 bg-red-50 border-red-100" : "text-amber-700 bg-amber-50 border-amber-100"
                }`}>
                  Оценка риска HBV: {assessment.score.toFixed(1)} / 10.5
                </div>

                {explanation ? (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    "{explanation}"
                  </p>
                ) : explaining ? (
                  <div className="text-xs text-slate-400 italic py-2 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Формирование пояснения ИИ...
                  </div>
                ) : (
                  <button
                    onClick={() => loadExplanation(assessment.score, assessment.flags)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium underline"
                  >
                    Запросить пояснение ИИ
                  </button>
                )}

                {assessment.flags && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Сработавшие факторы:</p>
                    <ul className="space-y-1.5">
                      {(typeof assessment.flags === "string" ? JSON.parse(assessment.flags) : assessment.flags).map((f: any, idx: number) => (
                        <li key={idx} className="text-xs text-slate-700 flex flex-col gap-0.5 bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="flex justify-between font-medium text-slate-850">
                            <span>{f.name}</span>
                            <span className="text-red-600 font-semibold">+{f.weight}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 leading-normal">{f.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Clinical Notes */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">{t("chat.clinicalNotes")}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">{t("chat.diagnosisLabel")}</label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter diagnosis" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">{t("chat.rxLabel")}</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  rows={3}
                  placeholder="Treatment plan..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              {consultation.status !== "COMPLETED" && (
                <div className="flex items-center gap-2 mt-1 py-1">
                  <input
                    type="checkbox"
                    id="followupApproved"
                    checked={followupApproved}
                    onChange={(e) => setFollowupApproved(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="followupApproved" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Approve priority clinic booking
                  </label>
                </div>
              )}
              {consultation.status !== "COMPLETED" && (
                <Button className="w-full" onClick={completeConsultation} disabled={completing}>
                  <CheckCircle className="h-4 w-4" />
                  {completing ? t("chat.completing") : t("chat.complete")}
                </Button>
              )}
              {consultation.status === "COMPLETED" && (
                <div className={`mt-1 rounded-lg p-2 text-center text-xs font-semibold border ${
                  followupApproved ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                }`}>
                  {followupApproved ? "✓ Clinic booking approved" : "Clinic booking not approved"}
                </div>
              )}
              {(diagnosis || prescription) && (
                <Button
                  id="generate-rx-btn"
                  variant="outline"
                  className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" /> {t("chat.downloadRx")}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
