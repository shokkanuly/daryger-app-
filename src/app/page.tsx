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
  HeartPulse,
} from "lucide-react";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getT(locale);

  const towns = [
    "Караганда",
    "Темиртау",
    "Шахтинск",
    "Абай",
    "Сарань",
    "Каркаралинск",
    "Балхаш",
    "Приозерск",
    "Алматы",
    "Астана",
  ];

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

  const combinedSteps = [
    {
      step: "1",
      icon: MessageCircle,
      title: "ИИ-Триаж симптомов",
      desc: "Опишите свои жалобы. Система оценит срочность и порекомендует врача или нужные анализы.",
    },
    {
      step: "2",
      icon: Stethoscope,
      title: "Онлайн-консультации",
      desc: "Связывайтесь с врачами из Караганды в чате при слабом 3G или по видеосвязи Daily.co.",
    },
    {
      step: "3",
      icon: FileBarChart,
      title: "Сравнение цен клиник",
      desc: "Ищите лучшую стоимость на исследования (УЗИ, МРТ, анализы) по базам клиник.",
    },
    {
      step: "4",
      icon: Calendar,
      title: "Запись и Рецепты",
      desc: "Записывайтесь на очный приём по приоритетной очереди и скачивайте PDF-рецепты.",
    },
  ];

  const features = [
    {
      icon: Search,
      title: "Сравнение цен",
      desc: "Агрегируем прайс-листы клиник региона и нормализуем названия услуг в единый каталог.",
      color: "teal",
    },
    {
      icon: Sparkles,
      title: "ИИ-Ассистент симптомов",
      desc: "Опишите недомогание — ИИ подберет нужные услуги и покажет лучшие предложения в клиниках.",
      color: "violet",
    },
    {
      icon: TrendingDown,
      title: "История цен",
      desc: "Отслеживайте динамику стоимости услуг, чтобы видеть реальные скидки и сезонные изменения.",
      color: "amber",
    },
    {
      icon: Shield,
      title: "Проверенные специалисты",
      desc: "Все врачи телемедицины проходят обязательную ручную верификацию лицензий администраторами.",
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

      {/* ─── Hero section combining Triage, Telemedicine, and Price Search ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
              <HeartPulse className="h-4 w-4 text-emerald-300 animate-pulse" />
              <span>Daryger — Единая платформа здравоохранения Карагандинской области</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight md:text-5xl lg:text-6xl tracking-tight">
              Медицинская помощь и поиск цен<br />
              <span className="text-emerald-200">без лишних поездок в город</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-teal-100 max-w-3xl mx-auto">
              Запись к врачам, автоматический ИИ-триаж симптомов, телемедицинские консультации для отдаленных районов и умный поиск лучших цен на медицинские услуги Казахстана.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 font-bold px-6 py-3 text-base shadow-xl">
                  <Stethoscope className="h-5 w-5 mr-1" />
                  Консультация врача
                </Button>
              </Link>
              <Link href="/price">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 px-6 py-3 text-base">
                  <Search className="h-5 w-5 mr-1" />
                  Сравнить цены на услуги
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Box on Landing Page */}
          <div className="relative max-w-2xl mx-auto mt-12 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl">
            <form action="/price" method="GET" className="relative flex">
              <input
                type="text"
                name="q"
                placeholder="Быстрый поиск цен: ОАК, МРТ, УЗИ, приём терапевта..."
                className="w-full rounded-xl border-0 bg-white pl-5 pr-36 py-4 text-slate-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-teal-700 hover:bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Найти
              </button>
            </form>
          </div>

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

      {/* ─── Platform Pillars ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Единая экосистема Daryger</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Объединяем доступ к телемедицинской поддержке региональных больниц и прозрачность цен частных лабораторий.
          </p>
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

      {/* ─── How it works (Step sequence) ─── */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Как работает платформа</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Интуитивный путь пациента от симптома к правильному специалисту и честному ценообразованию.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {combinedSteps.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  {step}
                </span>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Assistant CTA ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 p-8 text-white md:p-12 shadow-xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                <span className="text-violet-100">ИИ-Ассистент на Gemini 2.5</span>
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">Не знаете, какие анализы сдать?</h2>
              <p className="mt-4 text-violet-200">
                Опишите симптомы — ИИ-ассистент проанализирует жалобы, порекомендует нужные услуги и сразу покажет цены в клиниках вашего города.
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
                  Рекомендую: <strong>МРТ поясничного отдела</strong> + консультация невролога. Нашёл предложения от 12 000 ₸ в Караганде.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Source Transparency Strip ─── */}
      <section className="bg-slate-50 border-y border-slate-200 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
            Источники ценовых данных и клиники-партнеры
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "KDL Laboratory",
              "Invitro KZ",
              "Doq.kz",
              "Helix KZ",
              "Olymp Med",
              "МЕДЭЛ",
              "Regional Hospital Karaganda",
              "City Polyclinic No. 3",
            ].map((src) => (
              <span
                key={src}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600"
              >
                {src}
              </span>
            ))}
            <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
              + Добавляем новые
            </span>
          </div>
        </div>
      </section>

      {/* ─── City Coverage ─── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-12 shadow-xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Охватываем Карагандинскую область</h2>
              <p className="mt-4 text-slate-300">
                Жители Шахтинска, Абая, Сарани и других городов могут консультироваться с региональными специалистами онлайн без затрат на дорогу.
              </p>
              <div className="mt-6 flex items-center gap-2 text-teal-400">
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">Оптимизировано для слабого соединения</span>
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

      {/* ─── Quick Cabinets Access ─── */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700 border border-teal-100">
          <Stethoscope className="h-3.5 w-3.5" />
          Личные кабинеты Daryger
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Нужна консультация врача прямо сейчас?</h2>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          Подключайтесь к дежурным врачам онлайн, проходите автоматический триаж и получайте приоритетные записи.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-700 px-6 font-semibold">
              Записаться к врачу
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-6">
              Войти в личный кабинет
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Daryger</span>
            <span>· Дәрігер</span>
          </div>
          <p className="text-xs text-center">
            Агрегатор медицинских цен и телемедицинская платформа Карагандинской области · Все права защищены
          </p>
          <p className="text-xs text-slate-400 text-center">
            Terricon Valley Incubator Project · Разработано для улучшения доступности здравоохранения
          </p>
        </div>
      </footer>
    </>
  );
}
