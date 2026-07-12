"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KARAGANDA_TOWNS } from "@/lib/triage";
import { SPECIALTIES, CLINICS } from "@/lib/constants";
import { Stethoscope, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/language-context";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PATIENT",
    town: "Shakhtinsk",
    phone: "",
    specialty: "General Practitioner",
    clinic: "Regional Hospital Karaganda",
    licenseNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDoctor = form.role === "DOCTOR";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    router.push(data.redirect);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">Daryger</span>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.register.title")}</CardTitle>
          <CardDescription>{t("auth.register.sub")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.name")}</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.email")}</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.password")}</label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.role")}</label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="PATIENT">{t("auth.register.role.patient")}</option>
              <option value="DOCTOR">{t("auth.register.role.doctor")}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.town")}</label>
            <Select value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })}>
              {KARAGANDA_TOWNS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.phone")}</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 721 ..." />
          </div>

          {/* Doctor-specific fields — only shown when DOCTOR role selected */}
          {isDoctor && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wide">
                <ShieldCheck className="h-4 w-4" />
                {t("auth.register.role.doctor")}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.specialty")}</label>
                <Select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.clinic")}</label>
                <Select value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })}>
                  {CLINICS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.register.license")}</label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  placeholder="e.g. KZ-GP-2024-00123"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.register.submitting") : t("auth.register.submit")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-teal-600 hover:underline">
            {t("auth.register.signIn")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
