"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Loader2,
  Check,
  Stethoscope,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { URGENCY_COLORS } from "@/lib/constants";

interface Consilium {
  id: string;
  specialty: string;
  question: string;
  opinion: string | null;
  status: "REQUESTED" | "ACTIVE" | "COMPLETED";
  createdAt: string;
  consultation: {
    id: string;
    urgency: string;
    chiefComplaint: string | null;
    symptoms: string | null;
    patient: { id: string; name: string; town: string | null };
  };
  requestedBy: { id: string; name: string };
  specialist: { id: string; name: string } | null;
}

export default function TeleconsiliumPage() {
  const [items, setItems] = useState<Consilium[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [opinions, setOpinions] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/teleconsilium");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "claim" | "complete") {
    setBusy(id);
    await fetch(`/api/teleconsilium/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, opinion: opinions[id] }),
    });
    await load();
    setBusy(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const open = items.filter((i) => i.status === "REQUESTED");
  const active = items.filter((i) => i.status === "ACTIVE");
  const done = items.filter((i) => i.status === "COMPLETED");

  const card = (c: Consilium) => (
    <Card key={c.id} className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-violet-100 text-violet-700">{c.specialty}</Badge>
        <Badge
          className={
            URGENCY_COLORS[c.consultation.urgency as keyof typeof URGENCY_COLORS] ??
            "bg-slate-100 text-slate-600"
          }
        >
          {c.consultation.urgency}
        </Badge>
        <span className="font-medium text-slate-900">
          {c.consultation.patient.name}
        </span>
        {c.consultation.patient.town && (
          <span className="text-xs text-slate-500">
            · {c.consultation.patient.town}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Запрос от {c.requestedBy.name}
        {c.specialist && ` · консультант: ${c.specialist.name}`}
      </p>

      {c.consultation.chiefComplaint && (
        <p className="mt-2 text-sm text-slate-600">
          Жалоба: {c.consultation.chiefComplaint}
        </p>
      )}

      <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Вопрос консультанту
        </p>
        <p className="mt-1 text-sm text-slate-900">{c.question}</p>
      </div>

      {c.opinion && (
        <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Заключение
          </p>
          <p className="mt-1 text-sm text-slate-900">{c.opinion}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/doctor/consultations/${c.consultation.id}`}
          className="text-sm text-teal-700 hover:underline"
        >
          <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
          Открыть случай
        </Link>

        {c.status === "REQUESTED" && (
          <Button onClick={() => act(c.id, "claim")} disabled={busy === c.id}>
            {busy === c.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Stethoscope className="mr-1 h-4 w-4" />
                Взять консультацию
              </>
            )}
          </Button>
        )}
      </div>

      {c.status === "ACTIVE" && (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded border border-slate-300 p-2 text-sm"
            rows={3}
            placeholder="Заключение консультанта…"
            value={opinions[c.id] ?? ""}
            onChange={(e) =>
              setOpinions((prev) => ({ ...prev, [c.id]: e.target.value }))
            }
          />
          <Button
            onClick={() => act(c.id, "complete")}
            disabled={busy === c.id || !(opinions[c.id] ?? "").trim()}
          >
            <Check className="mr-1 h-4 w-4" />
            Отправить заключение
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Users className="h-6 w-6 text-teal-600" />
          Телеконсилиум «Врач-Врач»
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Мнение профильного специалиста без передачи пациента — случай остаётся
          у лечащего врача.
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Ожидают консультанта ({open.length})
        </h2>
        {open.length === 0 ? (
          <Card className="p-5 text-center text-sm text-slate-500">
            Открытых запросов нет.
          </Card>
        ) : (
          <div className="space-y-3">{open.map(card)}</div>
        )}
      </section>

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            В работе ({active.length})
          </h2>
          <div className="space-y-3">{active.map(card)}</div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            Завершённые ({done.length})
          </h2>
          <div className="space-y-3">{done.map(card)}</div>
        </section>
      )}
    </div>
  );
}
