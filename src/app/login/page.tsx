"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { useTranslation } from "@/lib/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
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
          <CardTitle>{t("auth.login.title")}</CardTitle>
          <CardDescription>{t("auth.login.sub")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.login.email")}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.kz" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("auth.login.password")}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-teal-50 p-3 text-xs text-teal-800">
          <p className="font-medium mb-1">{t("auth.login.demo")}</p>
          <p>Patient: patient@daryger.kz / demo123</p>
          <p>Doctor: doctor@daryger.kz / demo123</p>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-teal-600 hover:underline">
            {t("auth.login.register")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
