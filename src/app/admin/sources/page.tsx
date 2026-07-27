"use client";

import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  AlertTriangle,
  Check,
  Brain,
  Layers,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SystemStatus {
  system: string;
  label: string;
  records: number;
  linkedAccounts: number;
  lastSyncedAt: string | null;
  isMocked: boolean;
}

interface Conflict {
  id: string;
  subjectRef: string;
  recordType: string;
  field: string;
  values: { system: string; value: string }[];
  status: string;
  createdAt: string;
}

interface Analytics {
  stats: {
    totalRecords: number;
    subjects: number;
    openConflicts: number;
    staffStatusConflicts: number;
    conflictsByField: { field: string; count: number }[];
  };
  summary: string;
  summarySource: "gemini" | "fallback";
}

export default function SourcesPage() {
  const [systems, setSystems] = useState<SystemStatus[]>([]);
  const [openConflicts, setOpenConflicts] = useState(0);
  const [subjects, setSubjects] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    const [statusRes, conflictRes, analyticsRes] = await Promise.all([
      fetch("/api/sources"),
      fetch("/api/sources/conflicts?status=OPEN"),
      fetch("/api/sources/analytics"),
    ]);
    if (statusRes.ok) {
      const d = await statusRes.json();
      setSystems(d.systems);
      setOpenConflicts(d.openConflicts);
      setSubjects(d.consolidatedSubjects);
    }
    if (conflictRes.ok) setConflicts(await conflictRes.json());
    if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runSync() {
    setSyncing(true);
    await fetch("/api/sources/sync", { method: "POST" });
    await load();
    setSyncing(false);
  }

  async function resolve(conflict: Conflict, value: string) {
    setResolving(conflict.id);
    await fetch(`/api/sources/conflicts/${conflict.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedTo: value }),
    });
    await load();
    setResolving(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Layers className="h-6 w-6 text-teal-600" />
            Единая информационная система
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Консолидация данных из Damumed, ЕИСЗ, Aigýn, Qalqan и 1С
          </p>
        </div>
        <Button onClick={runSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Синхронизация…" : "Синхронизировать"}
        </Button>
      </div>

      {/* Mock disclosure — this must never be mistaken for a live integration. */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Демонстрационные данные</p>
          <p className="mt-0.5 text-amber-800">
            Ни одна из пяти систем не подключена — учётные данные отсутствуют. Каждый
            адаптер возвращает размеченные тестовые данные, реальные эндпоинты
            задокументированы в коде.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Субъектов консолидировано
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{subjects}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Систем подключено
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{systems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Открытых расхождений
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              openConflicts > 0 ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {openConflicts}
          </p>
        </Card>
      </div>

      {analytics && (
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            <h2 className="font-semibold text-slate-900">ИИ-сводка для руководителя</h2>
            <Badge className="bg-slate-100 text-slate-600">
              {analytics.summarySource === "gemini" ? "Gemini 2.5 Flash" : "Офлайн-режим"}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{analytics.summary}</p>
        </Card>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <Database className="h-5 w-5 text-slate-400" />
          Источники
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((s) => (
            <Card key={s.system} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.system}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700">mock</Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  Записей: <span className="font-medium text-slate-900">{s.records}</span>
                </p>
                <p>
                  Учётных записей:{" "}
                  <span className="font-medium text-slate-900">{s.linkedAccounts}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {s.lastSyncedAt
                    ? `Обновлено ${new Date(s.lastSyncedAt).toLocaleString("ru-RU")}`
                    : "Ещё не синхронизировано"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Расхождения между системами
        </h2>

        {conflicts.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            Расхождений нет — все системы согласованы.
          </Card>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c) => {
              const critical =
                c.recordType === "staff" && c.field === "employmentStatus";
              return (
                <Card
                  key={c.id}
                  className={`p-4 ${critical ? "border-red-200 bg-red-50/40" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700">{c.recordType}</Badge>
                    <span className="font-mono text-xs text-slate-500">{c.subjectRef}</span>
                    <span className="font-semibold text-slate-900">{c.field}</span>
                    {critical && (
                      <Badge className="bg-red-100 text-red-700">
                        риск незакрытого доступа
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {c.values.map((v) => (
                      <div
                        key={v.system}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-xs font-medium text-slate-500">
                            {v.system}
                          </span>
                          <span className="text-sm text-slate-900">{v.value}</span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => resolve(c, v.value)}
                          disabled={resolving === c.id}
                        >
                          {resolving === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Принять
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
