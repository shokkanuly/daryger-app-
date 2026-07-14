"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  Calendar,
  AlertTriangle,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string | null;
  workingHours: string | null;
  phone: string | null;
  sourceUrl: string | null;
}

interface Service {
  id: string;
  name: string;
  category: string;
  icdCode: string | null;
}

interface PriceRecord {
  id: string;
  serviceNameRaw: string;
  priceKzt: number;
  parsedAt: string;
  durationDays: number | null;
  clinic: Clinic;
}

interface HistoryPoint {
  date: string;
  priceKzt: number;
}

// ── SVG Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#0d9488" }: { data: HistoryPoint[]; color?: string }) {
  if (data.length < 2) return null;

  const W = 180;
  const H = 40;
  const prices = data.map((d) => d.priceKzt);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.priceKzt - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const trend = prices[prices.length - 1] <= prices[0] ? "#10b981" : "#ef4444";
  const first = pts[0];
  const last = pts[pts.length - 1];
  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const pct = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(0);

  return (
    <div className="flex items-center gap-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
        <polyline
          fill="none"
          stroke={trend}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts.join(" ")}
        />
        {/* start dot */}
        <circle cx={first.split(",")[0]} cy={first.split(",")[1]} r={2.5} fill={trend} opacity={0.5} />
        {/* end dot */}
        <circle cx={last.split(",")[0]} cy={last.split(",")[1]} r={3} fill={trend} />
      </svg>
      <div className="text-right shrink-0">
        <span
          className={`text-xs font-bold ${Number(pct) <= 0 ? "text-emerald-600" : "text-red-500"}`}
        >
          {Number(pct) > 0 ? "+" : ""}
          {pct}%
        </span>
        <p className="text-[10px] text-slate-400">{data.length} точек</p>
      </div>
    </div>
  );
}

// ── Per-Clinic History loader ──────────────────────────────────────────────────
function ClinicHistorySection({
  clinicId,
  serviceId,
}: {
  clinicId: string;
  serviceId: string;
}) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/price/history?clinicId=${clinicId}&serviceId=${serviceId}`
        );
        if (res.ok) setHistory(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [clinicId, serviceId]);

  if (loading)
    return (
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Загрузка тренда...
      </div>
    );

  if (history.length < 2)
    return <p className="text-[10px] text-slate-400">История цен: нет данных</p>;

  return (
    <div className="border-t border-slate-100 pt-3 mt-3">
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
        <TrendingDown className="h-3 w-3" />
        Динамика цен
      </p>
      <Sparkline data={history} />
    </div>
  );
}

// ── Main compare content ───────────────────────────────────────────────────────
function CompareContent() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const [service, setService] = useState<Service | null>(null);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;

    async function loadCompareData() {
      try {
        const sRes = await fetch(`/api/admin/services`);
        if (sRes.ok) {
          const list = await sRes.json();
          setService(list.find((s: Service) => s.id === serviceId) || null);
        }

        const pRes = await fetch(`/api/price/search?serviceId=${serviceId}&limit=20`);
        if (pRes.ok) {
          const data = await pRes.json();
          const matched = data.filter((p: any) => p.serviceId === serviceId);
          setRecords(matched);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    loadCompareData();
  }, [serviceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        Сравниваем цены клиник...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-lg font-semibold">Услуга не найдена</h2>
        <p className="text-sm text-slate-500 mt-1">
          Вернитесь назад и выберите стандартную услугу из каталога.
        </p>
        <Link href="/price" className="mt-4 inline-block">
          <Button size="sm">Назад к поиску</Button>
        </Link>
      </div>
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lowestPrice = records.length
    ? Math.min(...records.map((r) => Number(r.priceKzt)))
    : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white py-8 px-4 shadow">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/price"
            className="inline-flex items-center gap-1 text-xs text-teal-300 hover:text-white mb-3 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Назад к поиску
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-700/40">
                {service.category.toUpperCase()} {service.icdCode && `• МКБ-10: ${service.icdCode}`}
              </span>
              <h1 className="text-2xl font-extrabold mt-1 tracking-tight">{service.name}</h1>
              <p className="text-teal-200 text-sm mt-1">
                {records.length} {records.length === 1 ? "предложение" : "предложений"} от клиник Казахстана
              </p>
            </div>
            {lowestPrice > 0 && (
              <div className="text-right">
                <p className="text-xs text-teal-300">Лучшая цена</p>
                <p className="text-3xl font-extrabold text-emerald-300">{lowestPrice.toLocaleString()} ₸</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {records.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-200 bg-white">
            <p className="text-slate-500 text-sm">
              Нет данных о ценах клиник для этой услуги.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {records.map((rec, idx) => {
              const parsedDate = new Date(rec.parsedAt);
              const isOutdated = parsedDate < thirtyDaysAgo;
              const isCheapest = Number(rec.priceKzt) === lowestPrice;

              return (
                <Card
                  key={rec.id}
                  className={`flex flex-col justify-between overflow-hidden shadow-sm border relative ${
                    isCheapest
                      ? "border-emerald-300 ring-2 ring-emerald-200/50 bg-white"
                      : isOutdated
                      ? "border-amber-200 bg-amber-50/10"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {isCheapest && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Лучшая цена
                    </div>
                  )}

                  {/* Clinic Header */}
                  <div className="p-4 bg-slate-50/60 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-base pr-20">{rec.clinic.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-teal-500" />
                      {rec.clinic.city}
                    </p>
                  </div>

                  <div className="p-4 flex-1 space-y-3">
                    {/* Price */}
                    <div>
                      <span className="text-xs text-slate-400 block">Цена в клинике</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-slate-900">
                          {Number(rec.priceKzt).toLocaleString()} ₸
                        </span>
                        {isOutdated && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Устаревшая цена
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                        «{rec.serviceNameRaw}»
                      </span>
                    </div>

                    {/* Clinic details */}
                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      {rec.clinic.address && (
                        <p className="flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{rec.clinic.address}</span>
                        </p>
                      )}
                      {rec.clinic.workingHours && (
                        <p className="flex items-start gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{rec.clinic.workingHours}</span>
                        </p>
                      )}
                      {rec.clinic.phone && (
                        <p className="flex items-start gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{rec.clinic.phone}</span>
                        </p>
                      )}
                    </div>

                    {/* Срок выполнения */}
                    <div className="text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
                      <span>Срок выполнения:</span>
                      <span className="font-semibold text-slate-700">
                        {rec.durationDays
                          ? `${rec.durationDays} ${rec.durationDays === 1 ? "день" : "дней"}`
                          : "1 день"}
                      </span>
                    </div>

                    {/* Sparkline history */}
                    {serviceId && (
                      <ClinicHistorySection clinicId={rec.clinic.id} serviceId={serviceId} />
                    )}

                    <p className="text-[10px] text-slate-400 mt-1">
                      Обновлено: {formatDate(rec.parsedAt)}
                    </p>
                  </div>

                  {/* Footer buttons */}
                  <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col gap-2">
                    <Link
                      href={`/patient/appointments?clinic=${encodeURIComponent(rec.clinic.name)}&service=${encodeURIComponent(service.name)}`}
                      className="w-full"
                    >
                      <Button className="w-full text-xs py-2 bg-teal-700 hover:bg-teal-800">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Записаться в клинику
                      </Button>
                    </Link>

                    {rec.clinic.sourceUrl && (
                      <a
                        href={rec.clinic.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center text-slate-400 hover:text-slate-600 text-[10px] flex items-center justify-center gap-1 py-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Открыть публичный прайс-лист
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PriceComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          Загрузка сравнения...
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
