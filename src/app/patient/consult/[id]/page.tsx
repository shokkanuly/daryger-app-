"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, Mic, Calendar } from "lucide-react";
import { URGENCY_COLORS, STATUS_LABELS } from "@/lib/constants";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

interface Consultation {
  id: string;
  status: string;
  urgency: string;
  chiefComplaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
  doctor: { id: string; name: string } | null;
  patient: { name: string; town: string | null };
  messages: Message[];
}

export default function ConsultChatPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/consultations/${id}`);
    if (res.ok) setConsultation(await res.json());
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
    setSending(true);
    await fetch(`/api/consultations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    setMessage("");
    await load();
    setSending(false);
  }

  if (!consultation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading consultation...</div>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ height: "calc(100vh - 3.5rem)" }}>
      <Link href="/patient" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> Back to home
      </Link>

      <Card className="mb-4 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-900">{consultation.doctor?.name || "Connecting to doctor..."}</p>
            <p className="text-sm text-slate-500">{consultation.chiefComplaint}</p>
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
        {consultation.symptoms && (
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">{consultation.symptoms}</p>
        )}
      </Card>

      {consultation.diagnosis && (
        <Card className="mb-4 shrink-0 bg-teal-50 border-teal-200">
          <p className="text-sm font-medium text-teal-900">Diagnosis: {consultation.diagnosis}</p>
          {consultation.prescription && (
            <p className="text-sm text-teal-700 mt-1">Prescription: {consultation.prescription}</p>
          )}
        </Card>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        {consultation.messages.map((msg) => {
          const isMine = msg.sender.role === "PATIENT";
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  isMine ? "bg-teal-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"
                }`}
              >
                {!isMine && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>}
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {consultation.status !== "COMPLETED" && (
        <form onSubmit={sendMessage} className="mt-4 flex gap-2 shrink-0">
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50" title="Audio (coming soon)">
            <Mic className="h-4 w-4" />
          </button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" disabled={sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {consultation.status === "COMPLETED" && (
        <div className="mt-4 shrink-0">
          <Link href="/patient/appointments">
            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4" /> Book follow-up appointment
            </Button>
          </Link>
        </div>
      )}
    </main>
  );
}
