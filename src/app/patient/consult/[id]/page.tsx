"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Send, Video, VideoOff, Calendar, Download, AlertTriangle,
} from "lucide-react";
import { URGENCY_COLORS } from "@/lib/constants";
import { useTranslation } from "@/lib/language-context";
import { downloadPrescriptionPDF } from "@/lib/prescription-pdf";

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
  videoRoomUrl: string | null;
  doctor: { id: string; name: string } | null;
  patient: { name: string; town: string | null };
  messages: Message[];
}

export default function ConsultChatPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
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

  async function joinVideo() {
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
    } catch {
      setVideoError(true);
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
      diagnosis: consultation.diagnosis ?? "",
      prescription: consultation.prescription ?? "",
      date: new Date().toLocaleDateString("en-GB"),
    });
  }

  if (!consultation) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">{t("chat.loading")}</div>;
  }

  const statusLabel: Record<string, string> = {
    TRIAGE: t("status.TRIAGE"),
    WAITING: t("status.WAITING"),
    ACTIVE: t("status.ACTIVE"),
    COMPLETED: t("status.COMPLETED"),
    CANCELLED: t("status.CANCELLED"),
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ height: "calc(100vh - 3.5rem)" }}>
      <Link href="/patient" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ChevronLeft className="h-4 w-4" /> {t("chat.back")}
      </Link>

      <Card className="mb-4 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              {consultation.doctor?.name || t("chat.connecting")}
            </p>
            <p className="text-sm text-slate-500">{consultation.chiefComplaint}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Badge className={URGENCY_COLORS[consultation.urgency as keyof typeof URGENCY_COLORS]}>
              {consultation.urgency}
            </Badge>
            <Badge className="bg-slate-100 text-slate-600 border-slate-200">
              {statusLabel[consultation.status]}
            </Badge>
            {/* Video join button — only when consultation is active */}
            {consultation.status === "ACTIVE" && (
              <button
                id="join-video-btn"
                onClick={joinVideo}
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                {t("chat.joinVideo")}
              </button>
            )}
          </div>
        </div>
        {consultation.symptoms && (
          <p className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">{consultation.symptoms}</p>
        )}
      </Card>

      {/* Video fallback banner */}
      {videoError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shrink-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("chat.videoFallback")}
        </div>
      )}

      {/* Daily.co iframe modal */}
      {videoOpen && videoUrl && (
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Video className="h-4 w-4 text-teal-600" /> Video Consultation
            </span>
            <button
              onClick={() => { setVideoOpen(false); }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500"
            >
              <VideoOff className="h-3.5 w-3.5" /> Close video
            </button>
          </div>
          <iframe
            src={videoUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            className="w-full rounded-xl border border-slate-200"
            style={{ height: "340px" }}
            onError={() => { setVideoOpen(false); setVideoError(true); }}
          />
        </div>
      )}

      {consultation.diagnosis && (
        <Card className="mb-4 shrink-0 bg-teal-50 border-teal-200">
          <p className="text-sm font-medium text-teal-900">{t("chat.diagnosis")}: {consultation.diagnosis}</p>
          {consultation.prescription && (
            <p className="text-sm text-teal-700 mt-1">{t("chat.prescription")}: {consultation.prescription}</p>
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
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("chat.placeholder")}
            className="flex-1"
          />
          <Button type="submit" disabled={sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {consultation.status === "COMPLETED" && (
        <div className="mt-4 shrink-0 flex gap-2 flex-wrap">
          <Link href="/patient/appointments" className="flex-1">
            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4" /> {t("chat.bookFollowup")}
            </Button>
          </Link>
          {consultation.prescription && (
            <Button
              id="download-rx-btn"
              variant="outline"
              className="flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" /> {t("chat.downloadRx")}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
