"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ArrowRight,
  Sparkles,
  X,
  Send,
  Loader2,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string | null;
  workingHours: string | null;
  phone: string | null;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

interface PriceRecord {
  id: string;
  serviceNameRaw: string;
  priceKzt: number;
  parsedAt: string;
  clinic: Clinic;
  service: Service | null;
}

interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  text: string;
  services?: { serviceId: string | null; serviceName: string; clinicName: string; clinicCity: string; priceKzt: number }[];
}

const CITIES = ["Алматы", "Астана", "Шымкент", "Актобе", "Павлодар", "Қарағанды", "Темиртау", "Шахтинск"];
const CATEGORIES = [
  { value: "lab", label: "Лабораторные анализы" },
  { value: "diagnostic", label: "Диагностика (УЗИ, МРТ…)" },
  { value: "consult", label: "Приём врача" },
  { value: "procedure", label: "Процедуры / Инъекции" },
];

function PriceSearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // AI Assistant state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      sender: "bot",
      text: "Здравствуйте! Я ваш медицинский ИИ-ассистент. Опишите симптомы или жалобы (например: «болит поясница», «высокая температура»), и я помогу найти нужные анализы и сравнить цены в клиниках.",
      services: [],
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    performSearch();
  }, [city, category]);

  useEffect(() => {
    if (chatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, chatOpen]);

  async function performSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      const res = await fetch(`/api/price/search?${params.toString()}`);
      if (res.ok) setResults(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { id: Date.now(), sender: "user", text: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/price/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });
      const data = await res.json();

      const botText = [
        data.analysis || "Не удалось проанализировать симптомы.",
        data.recommendations?.length
          ? "\n\n**Рекомендации:**\n" + data.recommendations.map((r: string) => `• ${r}`).join("\n")
          : "",
      ].join("");

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: botText, services: data.services || [] },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: "ИИ-Ассистент временно недоступен. Попробуйте позже." },
      ]);
    }
    setChatLoading(false);
  }

  function formatBotText(text: string) {
    return text.split("\n").map((line, i) => {
      const withBold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return <div key={i} className={line.startsWith("•") ? "ml-2" : ""} dangerouslySetInnerHTML={{ __html: withBold }} />;
    });
  }

  // Group results by service
  const serviceGroups: Record<string, { serviceName: string; records: PriceRecord[] }> = {};
  results.forEach((rec) => {
    const key = rec.service?.id || `unmatched-${rec.serviceNameRaw}`;
    const name = rec.service?.name || rec.serviceNameRaw;
    if (!serviceGroups[key]) serviceGroups[key] = { serviceName: name, records: [] };
    serviceGroups[key].records.push(rec);
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ── Header Banner ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-teal-800 to-teal-900 text-white py-10 px-4 shadow-md">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-300 bg-teal-950/40 px-3 py-1 rounded-full border border-teal-800/40 mb-3">
            <TrendingDown className="h-3.5 w-3.5" />
            Daryger
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Сравнить цены на медицинские услуги</h1>
          <p className="mt-2 text-teal-200 text-sm max-w-md mx-auto">
            Анализы, диагностика, приёмы врачей — находим лучшую цену в клиниках Казахстана.
          </p>
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-4">
            <Card className="p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
                <SlidersHorizontal className="h-4 w-4 text-teal-600" />
                Фильтры
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Город</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Все города</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Категория услуги</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Все категории</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Цена (₸)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="От"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="До"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
                <Button className="w-full text-sm py-2 bg-teal-700 hover:bg-teal-800" onClick={performSearch}>
                  Применить фильтры
                </Button>
              </div>
            </Card>

            {/* AI Assistant quick-open */}
            <button
              onClick={() => setChatOpen(true)}
              className="mt-4 w-full rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-3 hover:bg-violet-100 transition-colors text-left"
            >
              <Sparkles className="h-6 w-6 text-violet-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-900">ИИ-Ассистент</p>
                <p className="text-xs text-violet-600 mt-0.5">Опишите симптомы — найдём нужные услуги</p>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-400 ml-auto" />
            </button>
          </aside>

          {/* Search & Results */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Поиск: анализ крови, ЭКГ, МРТ, консультация..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none shadow-sm bg-white"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <Button type="submit" className="rounded-xl px-5 bg-teal-800 hover:bg-teal-900">
                Найти
              </Button>
            </form>

            {/* Quick search tags */}
            <div className="flex flex-wrap gap-1.5">
              {["ОАК", "ОАМ", "ЭКГ", "УЗИ", "МРТ", "Терапевт", "Глюкоза", "ТТГ"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); setTimeout(performSearch, 50); }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                Поиск предложений...
              </div>
            ) : Object.keys(serviceGroups).length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
                <Search className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="font-medium">Ничего не найдено</p>
                <p className="text-sm mt-1">Попробуйте другое название услуги или воспользуйтесь ИИ-Ассистентом.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">
                  Найдено {Object.keys(serviceGroups).length} услуг · {results.length} предложений клиник
                </p>
                {Object.entries(serviceGroups).map(([key, group]) => {
                  const isStandard = !key.startsWith("unmatched-");
                  const lowestPrice = Math.min(...group.records.map((r) => Number(r.priceKzt)));
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  const hasOutdated = group.records.some((r) => new Date(r.parsedAt) < thirtyDaysAgo);

                  return (
                    <Card key={key} className="p-5 shadow-sm border border-slate-200 hover:border-teal-300 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isStandard ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-slate-100 text-slate-500"
                            }`}>
                              {isStandard ? "Стандартная услуга" : "Некатегоризированная"}
                            </span>
                            {hasOutdated && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> Есть устаревшие цены
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 mt-1 text-base">{group.serviceName}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {group.records.length} {group.records.length === 1 ? "предложение" : "предложений"} ·{" "}
                            Мин. {lowestPrice.toLocaleString()} ₸
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-xs text-slate-400">от</p>
                          <p className="text-2xl font-extrabold text-teal-700">{lowestPrice.toLocaleString()} ₸</p>
                        </div>
                      </div>

                      {/* Clinic pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {group.records.slice(0, 4).map((rec) => (
                          <span key={rec.id} className="flex items-center gap-1 text-xs rounded-full border border-slate-200 px-2.5 py-1 text-slate-600">
                            <MapPin className="h-3 w-3 text-teal-500" />
                            {rec.clinic.name} — <strong>{Number(rec.priceKzt).toLocaleString()} ₸</strong>
                          </span>
                        ))}
                        {group.records.length > 4 && (
                          <span className="text-xs text-slate-400 self-center">+{group.records.length - 4} клиник</span>
                        )}
                      </div>

                      {isStandard ? (
                        <Link href={`/price/compare?serviceId=${key}`} className="w-full block">
                          <Button variant="outline" size="sm" className="w-full border-teal-600 text-teal-700 hover:bg-teal-50 text-xs flex items-center justify-center gap-1">
                            Сравнить цены по клиникам
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/patient/appointments?service=${encodeURIComponent(group.serviceName)}`}>
                          <Button size="sm" className="w-full bg-teal-800 hover:bg-teal-900 text-xs">
                            Записаться в клинику
                          </Button>
                        </Link>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── AI Chat Drawer ─────────────────────────────────────────────────────── */}
      {/* Floating button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 shadow-2xl text-sm font-semibold transition-all hover:scale-105"
        >
          <Sparkles className="h-4 w-4" />
          ИИ-Ассистент
        </button>
      )}

      {/* Drawer */}
      {chatOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full max-w-sm h-[520px] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-t-2xl md:rounded-2xl md:bottom-6 md:right-6">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-2xl text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="font-semibold text-sm">ИИ-Ассистент</p>
                <p className="text-xs text-violet-200">Gemini 2.5 Flash · Daryger</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.sender === "user" ? "bg-teal-600 text-white" : "bg-violet-600 text-white"
                }`}>
                  {msg.sender === "user" ? "Вы" : "ИИ"}
                </div>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.sender === "user" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-800"
                }`}>
                  <div>{formatBotText(msg.text)}</div>
                  {/* Service price suggestions */}
                  {msg.services && msg.services.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                      {msg.services.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-teal-50 rounded-lg px-2 py-1">
                          <span className="text-teal-800 font-medium flex-1 truncate">{s.serviceName}</span>
                          <span className="text-teal-700 font-bold shrink-0">{s.priceKzt.toLocaleString()} ₸</span>
                        </div>
                      ))}
                      {msg.services[0]?.serviceId && (
                        <Link href={`/price/compare?serviceId=${msg.services[0].serviceId}`} className="block text-center text-xs text-violet-700 font-semibold mt-1 hover:underline">
                          Сравнить цены подробно →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">ИИ</div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Анализирую...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleChatSubmit} className="flex gap-2 p-3 border-t border-slate-100 bg-white rounded-b-2xl">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Опишите симптомы или жалобы..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white p-2 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default function PriceSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mr-2" />Загрузка...</div>}>
      <PriceSearchContent />
    </Suspense>
  );
}
