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
  Search,
  TrendingDown,
  Sparkles,
  FileBarChart,
  ChevronRight,
  Building2,
} from "lucide-react";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getT(locale);

  const towns = ["Алматы", "Астана", "Шымкент", "Актобе", "Павлодар", "Қарағанды", "Темиртау", "Шахтинск"];

  const quickTags = [
    { label: "ОАК (Общий анализ крови)", q: "ОАК" },
    { label: "ОАМ (Анализ мочи)", q: "анализ мочи" },
    { label: "МРТ головного мозга", q: "МРТ" },
    { label: "УЗИ брюшной полости", q: "УЗИ" },
    { label: "ЭКГ", q: "ЭКГ" },
    { label: "Приём терапевта", q: "терапевт" },
    { label: "Глюкоза крови", q: "глюкоза" },
    { label: "ПЦР тест", q: "ПЦР" },
  ];

  const features = [
    {
      icon: Search,
      title: "Сравнение цен",
      desc: "Агрегируем прайс-листы из открытых источников и нормализуем названия услуг в единый справочник.",
      color: "teal",
    },
    {
      icon: Sparkles,
      title: "ИИ-Ассистент",
      desc: "Опишите симптомы — ИИ найдёт нужные анализы и услуги и покажет лучшие цены в вашем городе.",
      color: "violet",
    },
    {
      icon: TrendingDown,
      title: "История цен",
      desc: "Отслеживайте динамику цен в клинике, чтобы принимать взвешенные решения на основе трендов.",
      color: "amber",
    },
    {
      icon: FileBarChart,
      title: "Таблица сравнения",
      desc: "Выбирайте до 3 клиник и сравнивайте цены на одну услугу в удобном формате side-by-side.",
      color: "blue",
    },
  ];

  const colorMap: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <>
      <Nav />

      {/* ─── Hero with Search ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
              <Building2 className="h-3.5 w-3.5" />
              <span>MedServicePrice.kz — агрегатор медицинских услуг Казахстана</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl tracking-tight">
              Найдите лучшую цену<br />
              <span className="text-emerald-200">на медицинские услуги</span>
            </h1>
            <p className="mt-5 text-lg text-teal-100 max-w-2xl mx-auto">
              Сравниваем цены на анализы, приёмы врачей и диагностику из открытых прайс-листов клиник Казахстана. Как Aviasales — только для медицины.
            </p>
          </div>

          {/* Search Bar */}
          <form action="/price" method="GET" className="relative max-w-2xl mx-auto">
            <input
              type="text"
              name="q"
              placeholder="Поиск: ОАК, МРТ, УЗИ, приём терапевта..."
              className="w-full rounded-2xl border-0 bg-white pl-5 pr-36 py-4 text-slate-800 text-base shadow-2xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-teal-700 hover:bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Найти
            </button>
          </form>

          {/* Quick Tags */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {quickTags.map((tag) => (
              <Link
                key={tag.q}
                href={`/price?q=${encodeURIComponent(tag.q)}`}
                className="rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-1.5 text-xs font-medium text-teal-50 border border-white/20 backdrop-blur transition-colors"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Feature Pillars ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Как это работает</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">Платформа автоматически собирает прайс-листы клиник, нормализует их и предоставляет удобный поиск.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${colorMap[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Source Transparency Strip ─────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-200 py-10">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Собираем данные с открытых источников</p>
          <div className="flex flex-wrap justify-center gap-4">
            {["KDL Laboratory", "Invitro KZ", "Doq.kz", "Helix KZ", "Olymp Med", "МЕДЭЛ", "Aksai Clinic", "MCK"].map((src) => (
              <span key={src} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600">
                {src}
              </span>
            ))}
            <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
              + Добавляем новые
            </span>
          </div>
        </div>
      </section>

      {/* ─── AI Assistant CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                <span className="text-violet-100">ИИ-Ассистент на Gemini 2.5</span>
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">Не знаете, какие анализы сдать?</h2>
              <p className="mt-4 text-violet-200">
                Опишите симптомы — ИИ-ассистент проанализирует жалобы, рекомендует нужные услуги и сразу покажет цены в клиниках вашего города.
              </p>
              <Link href="/price" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-violet-800 font-semibold px-5 py-2.5 text-sm hover:bg-violet-50 transition-colors">
                Открыть ИИ-Ассистент
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-sm space-y-4 border border-white/20">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-400 flex items-center justify-center text-xs font-bold text-white shrink-0">Вы</div>
                <div className="bg-white/15 rounded-xl px-4 py-3 text-violet-100">Болит поясница, отдаёт в ногу уже неделю</div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <div className="h-8 w-8 rounded-full bg-emerald-400 flex items-center justify-center text-xs font-bold text-white shrink-0">ИИ</div>
                <div className="bg-white/15 rounded-xl px-4 py-3 text-violet-100 text-left">
                  Рекомендую: <strong>МРТ поясничного отдела</strong> + консультация невролога. Нашёл предложения от 12 000 ₸ в Алматы.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── City Coverage ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Охватываем все регионы Казахстана</h2>
              <p className="mt-4 text-slate-300">
                Алматы, Астана, Шымкент, Актобе, Павлодар, Қарағанды и другие города. Добавляем новые источники ежедневно.
              </p>
              <div className="mt-6 flex items-center gap-2 text-teal-400">
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">Данные обновляются ежедневно</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {towns.map((town) => (
                <span key={town} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm">
                  {town}
                </span>
              ))}
              <span className="rounded-full border border-teal-600 bg-teal-600/20 px-3 py-1.5 text-sm text-teal-300">
                + Другие города
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Telemedicine CTA (keep for Daryger) ──────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700 border border-teal-100">
            <Stethoscope className="h-3.5 w-3.5" />
            Телемедицина Daryger
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Нужна консультация врача прямо сейчас?</h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">
            Daryger — телемедицинская платформа для Қарағанды региона. Подключайтесь к дежурному врачу онлайн без поездки в город.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                Записаться к врачу
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                {t("home.cta2.doctor")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-slate-700">MedServicePrice.kz</span>
            <span>· Daryger · Дәрігер</span>
          </div>
          <p className="text-xs">Агрегатор цен на медицинские услуги в Казахстане · Данные из открытых публичных источников</p>
          <p className="text-xs text-slate-400">Terricon Valley Hackathon 2025 · Karaganda Region Telemedicine Platform</p>
        </div>
      </footer>
    </>
  );
}
