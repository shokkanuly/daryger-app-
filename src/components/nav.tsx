import Link from "next/link";
import { cookies } from "next/headers";
import { Stethoscope, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getT, getLocaleFromCookieValue, LOCALE_COOKIE } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";

interface NavProps {
  role?: "PATIENT" | "DOCTOR" | "CLINIC_ADMIN" | "PARTNER_OPERATOR" | "FINANCE_ANALYST" | "HR_ANALYST" | "SYSTEM_ADMIN";
}

export async function Nav({ role }: NavProps) {
  const session = await getSession();
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getT(locale);

  const links =
    role === "DOCTOR"
      ? [
          { href: "/doctor", label: t("nav.dashboard") },
          { href: "/doctor/consultations", label: t("nav.consultations") },
          { href: "/doctor/patients", label: t("nav.patients") },
          { href: "/doctor/schedule", label: t("nav.schedule") },
        ]
      : role === "CLINIC_ADMIN"
      ? [
          { href: "/ops", label: "Clinic Ops" },
        ]
      : role === "FINANCE_ANALYST"
      ? [
          { href: "/finance", label: "Finance Ops" },
        ]
      : role === "SYSTEM_ADMIN" || role === "PARTNER_OPERATOR"
      ? [
          { href: "/price/admin", label: "Admin Dashboard" },
          { href: "/admin/catalog", label: "Price Catalog" },
          { href: "/admin/unmatched", label: "Unmatched Queue" },
        ]
      : [
          { href: "/patient", label: t("nav.home") },
          { href: "/patient/consult", label: t("nav.getHelp") },
          { href: "/patient/appointments", label: t("nav.appointments") },
          { href: "/price", label: "Compare Prices" },
        ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={role === "DOCTOR" ? "/doctor" : role === "PATIENT" ? "/patient" : "/"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">Daryger</span>
          <span className="hidden text-xs text-slate-400 sm:inline">Дәрігер</span>
        </Link>

        {session && role && (
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-slate-600 hover:text-teal-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {/* Language toggle — client island inside a server component */}
          <LangToggle />

          {session ? (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {session.name}
                {session.town && <span className="text-slate-400"> · {session.town}</span>}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600">
                {t("nav.signIn")}
              </Link>
              <Link href="/register" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
