"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, MapPin, Phone, CheckCircle } from "lucide-react";
import { URGENCY_COLORS, STATUS_LABELS } from "@/lib/constants";

interface Message {
  id: string;
  content: string;
  sender: { id: string; name: string; role: string };
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
  patient: { name: string; town: string | null; phone: string | null };
  messages: Message[];
}

export default function DoctorConsultChatPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [message, setMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/consultations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConsultation(data);
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.prescription) setPrescription(data.prescription);
    }
  }

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
      body: JSON.stringify({ status: "COMPLETED", diagnosis, prescription }),
    });
    await load();
    setCompleting(false);
  }

  if (!consultation) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/doctor/consultations" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Back to queue
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
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
              <div className="flex gap-2">
                <Badge className={URGENCY_COLORS[consultation.urgency as keyof typeof URGENCY_COLORS]}>
                  {consultation.urgency}
                </Badge>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {STATUS_LABELS[consultation.status as keyof typeof STATUS_LABELS]}
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium">{consultation.chiefComplaint}</p>
            {consultation.symptoms && <p className="text-xs text-slate-500 mt-1">{consultation.symptoms}</p>}
          </Card>

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
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply to patient..." className="flex-1" />
              <Button type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Clinical notes</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Diagnosis</label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter diagnosis" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Prescription / advice</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  rows={3}
                  placeholder="Treatment plan..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              {consultation.status !== "COMPLETED" && (
                <Button className="w-full" onClick={completeConsultation} disabled={completing}>
                  <CheckCircle className="h-4 w-4" />
                  {completing ? "Saving..." : "Complete consultation"}
                </Button>
              )}
            </div>
          </Card>

          {consultation.triageData && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">Triage data</h3>
              <pre className="text-xs text-slate-500 whitespace-pre-wrap">
                {JSON.stringify(JSON.parse(consultation.triageData), null, 2)}
              </pre>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
