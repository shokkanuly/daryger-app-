"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE, translations } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(l: Locale) {
    setLocaleState(l);
    // Write cookie so server components pick up the new locale on next request
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365}`;
  }

  function t(key: string): string {
    const dict = translations[locale] ?? translations[DEFAULT_LOCALE];
    return dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
