"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/language-context";
import type { Locale } from "@/lib/i18n";

export function LangToggle() {
  const { locale, setLocale } = useTranslation();
  const router = useRouter();

  function toggle() {
    const next: Locale = locale === "kk" ? "en" : "kk";
    setLocale(next);
    // Refresh server components so translated labels update
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      id="lang-toggle"
      aria-label="Switch language"
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-teal-400 hover:text-teal-600"
    >
      {locale === "kk" ? (
        <>
          <span>ҚАЗ</span>
          <span className="text-slate-300">|</span>
          <span className="font-normal text-slate-400">ENG</span>
        </>
      ) : (
        <>
          <span className="font-normal text-slate-400">ҚАЗ</span>
          <span className="text-slate-300">|</span>
          <span>ENG</span>
        </>
      )}
    </button>
  );
}
