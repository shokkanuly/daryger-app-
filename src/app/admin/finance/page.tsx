"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  FileText,
  ShieldAlert,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Flag {
  id: string;
  sourceA: string;
  sourceB: string;
  category: string;
  amountA: string;
  amountB: string | null;
  discrepancy: string;
  kind: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  programme: string;
  serviceCategory: string;
  timeElapsed: number;
  volumeDelivered: number;
  projectedCompletion: number;
  risk: "UNDER_DELIVERY" | "OVER_DELIVERY" | "ON_TRACK";
}

interface FinanceData {
  sources: { source: string; label: string; records: number; isMocked: boolean }[];
  reconciliation: { openFlags: number; totalDiscrepancy: number; flags: Flag[] };
  forecasts: {
    id: string;
    period: string;
    category: string;
    forecastAmount: string;
    method: string;
  }[];
  allocations: {
    overspent: { programme: string; category: string; over: number }[];
    underused: { programme: string; category: string; usedPct: number }[];
  };
  contracts: Contract[];
}

interface Anomaly {
  id: string;
  employeeRef: string;
  employeeName: string | null;
  type: string;
  severity: string;
  detail: string;
}

const kzt = (n: number | string) =>
  `${Math.round(Number(n)).toLocaleString("ru-RU")} ₸`;

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    const [f, h] = await Promise.all([
      fetch("/api/finance"),
      fetch("/api/hr/anomalies?status=OPEN"),
    ]);
    if (f.ok) setData(await f.json());
    if (h.ok) setAnomalies(await h.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runPipeline() {
    setRunning(true);
    await fetch("/api/finance/run", { method: "POST" });
    await load();
    setRunning(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-6 text-center text-sm text-slate-500">
          Нет доступа к финансовому модулю. Требуется роль FINANCE_ANALYST или
          SYSTEM_ADMIN.
        </Card>
      </div>
    );
  }

  const riskLabel: Record<Contract["risk"], { text: string; cls: string }> = {
    UNDER_DELIVERY: { text: "недоосвоение", cls: "bg-amber-100 text-amber-700" },
    OVER_DELIVERY: { text: "перевыполнение", cls: "bg-red-100 text-red-700" },
    ON_TRACK: { text: "в графике", cls: "bg-emerald-100 text-emerald-700" },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Wallet className="h-6 w-6 text-teal-600" />
            Финансы и управление
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ЕСОМП · Казына · 1С — сверка, планирование, контроль договоров и кадров
          </p>
        </div>
        <Button onClick={runPipeline} disabled={running}>
          <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Обработка…" : "Загрузить и сверить"}
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Демонстрационные выгрузки</p>
          <p className="mt-0.5 text-amber-800">
            ЕСОМП, Казына и 1С не подключены. Данные загружаются из выгрузок
            (CSV/XLSX) — именно так эти системы доступны клинике на практике.
          </p>
        </div>
      </div>

      {/* ── Task 8 · reconciliation ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Расхождений
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              data.reconciliation.openFlags > 0 ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {data.reconciliation.openFlags}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Сумма расхождений
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {kzt(data.reconciliation.totalDiscrepancy)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Кадровых нарушений
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              anomalies.length > 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {anomalies.length}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Автоматическая сверка между системами
        </h2>
        {data.reconciliation.flags.length === 0 ? (
          <p className="text-sm text-slate-500">Расхождений не обнаружено.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="pb-2">Тип</th>
                  <th className="pb-2">Системы</th>
                  <th className="pb-2">Статья</th>
                  <th className="pb-2 text-right">Расхождение</th>
                </tr>
              </thead>
              <tbody>
                {data.reconciliation.flags.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <Badge
                        className={
                          f.kind === "MISSING_IN_B"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {f.kind === "MISSING_IN_B" ? "нет записи" : "сумма"}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-slate-600">
                      {f.sourceA} → {f.sourceB}
                    </td>
                    <td className="py-2 text-slate-900">{f.category}</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {kzt(f.discrepancy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Task 7 · contracts ──────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <FileText className="h-5 w-5 text-slate-400" />
          Исполнение договоров ОСМС / ГОБМП
        </h2>
        <div className="space-y-3">
          {data.contracts.map((c) => (
            <div key={c.id} className="rounded border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {c.contractNumber}
                  </span>
                  <Badge className="bg-slate-100 text-slate-600">
                    {c.programme}
                  </Badge>
                </div>
                <Badge className={riskLabel[c.risk].cls}>
                  {riskLabel[c.risk].text}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{c.serviceCategory}</p>

              {/* Delivery against elapsed time — the marker is where delivery
                  should be if the contract were exactly on plan. */}
              <div className="relative mt-3 h-2 w-full rounded bg-slate-100">
                <div
                  className={`h-2 rounded ${
                    c.risk === "ON_TRACK"
                      ? "bg-emerald-500"
                      : c.risk === "OVER_DELIVERY"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(c.volumeDelivered * 100, 100)}%` }}
                />
                <div
                  className="absolute top-[-3px] h-3.5 w-0.5 bg-slate-700"
                  style={{ left: `${Math.min(c.timeElapsed * 100, 100)}%` }}
                  title="Ожидаемый уровень по времени"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Выполнено {(c.volumeDelivered * 100).toFixed(0)}% · прошло{" "}
                {(c.timeElapsed * 100).toFixed(0)}% срока · прогноз{" "}
                <span className="font-medium text-slate-700">
                  {(c.projectedCompletion * 100).toFixed(0)}%
                </span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Tasks 6 + 9 · forecast and allocations ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            Прогноз бюджета
          </h2>
          <div className="space-y-2">
            {data.forecasts.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="text-slate-900">{f.category}</p>
                  {/* Say plainly when a "forecast" is one quarter copied forward. */}
                  {f.method.includes("insufficient") && (
                    <p className="text-xs text-amber-600">
                      мало истории — оценка приблизительная
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-medium text-slate-900">
                  {kzt(f.forecastAmount)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <Wallet className="h-5 w-5 text-slate-400" />
            Освоение бюджета
          </h2>
          <div className="space-y-2 text-sm">
            {data.allocations.overspent.map((o) => (
              <div
                key={`${o.programme}-${o.category}`}
                className="flex items-start gap-2"
              >
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-slate-900">{o.category}</p>
                  <p className="text-xs text-red-600">
                    {o.programme} · перерасход {kzt(o.over)}
                  </p>
                </div>
              </div>
            ))}
            {data.allocations.underused.map((u) => (
              <div
                key={`${u.programme}-${u.category}`}
                className="flex items-start gap-2"
              >
                <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-slate-900">{u.category}</p>
                  <p className="text-xs text-amber-600">
                    {u.programme} · освоено {u.usedPct}% — риск недоосвоения
                  </p>
                </div>
              </div>
            ))}
            {data.allocations.overspent.length === 0 &&
              data.allocations.underused.length === 0 && (
                <p className="text-slate-500">Все статьи в норме.</p>
              )}
          </div>
        </Card>
      </div>

      {/* ── Task 10 · HR ───────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <Users className="h-5 w-5 text-slate-400" />
          Кадровые процессы
        </h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-slate-500">Нарушений не обнаружено.</p>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className={`rounded border p-3 ${
                  a.severity === "HIGH"
                    ? "border-red-200 bg-red-50/40"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      a.severity === "HIGH"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {a.severity}
                  </Badge>
                  <span className="font-medium text-slate-900">
                    {a.employeeName ?? a.employeeRef}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {a.employeeRef}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{a.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
