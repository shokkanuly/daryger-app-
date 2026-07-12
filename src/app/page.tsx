import Link from "next/link";
import { cookies } from "next/headers";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getT, getLocaleFromCookieValue, LOCALE_COOKIE } from "@/lib/i18n";
import {
  Stethoscope,
  MapPin,
  MessageCircle,
  Calendar,
  Shield,
  Wifi,
  ArrowRight,
  Clock,
  Users,
} from "lucide-react";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getT(locale);

  const towns = ["Shakhtinsk", "Temirtau", "Abay", "Saran", "Satbayev", "Karkaraly"];

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              {t("home.badge")}
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              {t("home.hero.title")}
            </h1>
            <p className="mt-5 text-lg text-teal-100 md:text-xl">
              {t("home.hero.sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50">
                  {t("home.cta.start")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                  {t("home.cta.signIn")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{t("home.problem.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t("home.problem.sub")}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Clock, title: t("home.problem.1.title"), desc: t("home.problem.1.desc") },
            { icon: Users, title: t("home.problem.2.title"), desc: t("home.problem.2.desc") },
            { icon: Stethoscope, title: t("home.problem.3.title"), desc: t("home.problem.3.desc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Icon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">{t("home.howItWorks.title")}</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              { step: "1", icon: MessageCircle, title: t("home.step.1.title"), desc: t("home.step.1.desc") },
              { step: "2", icon: Shield, title: t("home.step.2.title"), desc: t("home.step.2.desc") },
              { step: "3", icon: MapPin, title: t("home.step.3.title"), desc: t("home.step.3.desc") },
              { step: "4", icon: Calendar, title: t("home.step.4.title"), desc: t("home.step.4.desc") },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-xl border border-teal-100 bg-teal-50/50 p-5">
                <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  {step}
                </span>
                <Icon className="mb-3 h-6 w-6 text-teal-600" />
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("home.coverage.title")}</h2>
              <p className="mt-4 text-slate-300">{t("home.coverage.sub")}</p>
              <div className="mt-6 flex items-center gap-2 text-teal-400">
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">{t("home.coverage.badge")}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {towns.map((town) => (
                <span key={town} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm">
                  {town}
                </span>
              ))}
              <span className="rounded-full border border-teal-600 bg-teal-600/20 px-3 py-1.5 text-sm text-teal-300">
                + Karaganda hub
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{t("home.cta2.title")}</h2>
        <p className="mt-3 text-slate-600">{t("home.cta2.sub")}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register">
            <Button size="lg">{t("home.cta2.patient")}</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">{t("home.cta2.doctor")}</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Daryger</span>
            <span>· Дәрігер</span>
          </div>
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </>
  );
}
