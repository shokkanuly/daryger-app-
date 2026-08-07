"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Stethoscope,
  Video,
  Search,
  CalendarClock,
  Loader2,
  CheckCircle2,
  BadgeCheck,
  X,
  Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Slot {
  id: string;
  date: string;
  time: string;
}
interface Provider {
  id: string;
  name: string;
  providerType: "DOCTOR" | "FELDSHER";
  specialty: string;
  clinic: string;
  town: string;
  offersTelemedicine: boolean;
  isVerified: boolean;
  bio: string | null;
  nextSlots: Slot[];
}

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export default function FindPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [town, setTown] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [teleOnly, setTeleOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [booking, setBooking] = useState<{ provider: Provider; slot: Slot } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (town) params.set("town", town);
    if (type) params.set("type", type);
    if (query.trim()) params.set("specialty", query.trim());
    if (teleOnly) params.set("telemedicine", "true");
    const res = await fetch(`/api/find?${params.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setProviders(d.results);
      setTowns(d.facets.towns);
      // Regions are stable; set once so the list does not shrink as filters narrow.
      if (d.facets.regions?.length) setRegions(d.facets.regions);
    }
    setLoading(false);
  }, [region, town, type, query, teleOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero — states the pitch's promise plainly */}
      <div className="bg-gradient-to-b from-teal-700 to-teal-600 px-4 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold md:text-4xl">Найдите врача или фельдшера рядом</h1>
          <p className="mt-2 max-w-2xl text-teal-50">
            Малые города и посёлки по всему Казахстану — врачи и сельские фельдшеры.
            Запишитесь на очный приём или телемедицину за 3 минуты, без регистрации.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Специальность: ортопед, кардиолог, педиатр…"
                className="w-full rounded-lg border-0 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setTown(""); // region changed — clear the now-irrelevant town
              }}
              className="rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-teal-300"
            >
              <option value="">Все регионы</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-teal-300"
            >
              <option value="">Все города</option>
              {towns.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[
              { v: "", l: "Все" },
              { v: "DOCTOR", l: "Врачи" },
              { v: "FELDSHER", l: "Фельдшеры" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setType(o.v)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  type === o.v ? "bg-white text-teal-700" : "bg-teal-500/40 text-white hover:bg-teal-500/60"
                }`}
              >
                {o.l}
              </button>
            ))}
            <button
              onClick={() => setTeleOnly((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                teleOnly ? "bg-white text-teal-700" : "bg-teal-500/40 text-white hover:bg-teal-500/60"
              }`}
            >
              <Video className="h-3.5 w-3.5" /> Телемедицина
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : providers.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">
            Никого не нашли по этим фильтрам. Попробуйте изменить город или специальность.
          </Card>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {providers.length}{" "}
              {providers.length === 1 ? "специалист" : "специалистов"} найдено
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((p) => (
                <Card key={p.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        {p.isVerified && <BadgeCheck className="h-4 w-4 text-teal-600" />}
                      </div>
                      <p className="text-sm text-slate-600">{p.specialty}</p>
                    </div>
                    <Badge
                      className={
                        p.providerType === "FELDSHER"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-teal-100 text-teal-700"
                      }
                    >
                      {p.providerType === "FELDSHER" ? "Фельдшер" : "Врач"}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {p.town}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" /> {p.clinic}
                    </span>
                    {p.offersTelemedicine && (
                      <span className="flex items-center gap-1 text-teal-600">
                        <Video className="h-3.5 w-3.5" /> телемедицина
                      </span>
                    )}
                  </div>

                  {p.bio && <p className="mt-3 text-sm text-slate-600">{p.bio}</p>}

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      <CalendarClock className="h-3.5 w-3.5" /> Ближайшая запись
                    </p>
                    {p.nextSlots.length === 0 ? (
                      <p className="text-sm text-slate-400">Нет свободного времени</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {p.nextSlots.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setBooking({ provider: p, slot: s })}
                            className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-700 transition-colors hover:bg-teal-100"
                          >
                            {fmtDate(s.date)} · {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {booking && (
        <BookingModal
          provider={booking.provider}
          slot={booking.slot}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function BookingModal({
  provider,
  slot,
  onClose,
  onBooked,
}: {
  provider: Provider;
  slot: Slot;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telemedicine, setTelemedicine] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/find/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: provider.id,
        slotId: slot.id,
        patientName: name,
        patientPhone: phone,
        telemedicine,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Не удалось записаться. Попробуйте другое время.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
            <h3 className="mt-3 text-lg font-semibold text-slate-900">Вы записаны</h3>
            <p className="mt-1 text-sm text-slate-600">
              {provider.name} · {fmtDate(slot.date)} в {slot.time}
              <br />
              {telemedicine ? "Дистанционно (телемедицина)" : provider.clinic}
            </p>
            <p className="mt-2 text-xs text-slate-400">{provider.town}</p>
            <Button className="mt-5 w-full" onClick={onBooked}>
              Готово
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Запись на приём</h3>
                <p className="text-sm text-slate-600">
                  {provider.name} · {provider.specialty}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="flex items-center gap-2 text-slate-700">
                <CalendarClock className="h-4 w-4 text-teal-600" />
                {fmtDate(slot.date)} в {slot.time}
              </p>
              <p className="mt-1 flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4" /> {provider.town} · {provider.clinic}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Ваше имя</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Айгерим" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Телефон</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 701 000 0000"
                    className="pl-9"
                  />
                </div>
              </div>
              {provider.offersTelemedicine && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={telemedicine}
                    onChange={(e) => setTelemedicine(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  Дистанционно (телемедицина) вместо очного приёма
                </label>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <Button
              className="mt-5 w-full"
              onClick={submit}
              disabled={submitting || !name.trim() || !phone.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Записаться"}
            </Button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Без регистрации — только имя и телефон
            </p>
          </>
        )}
      </div>
    </div>
  );
}
