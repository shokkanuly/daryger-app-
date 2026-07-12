import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/lib/language-context";
import { getLocaleFromCookieValue, LOCALE_COOKIE } from "@/lib/i18n";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Daryger — Telemedicine for Karaganda Region",
  description: "Digital healthcare bridge connecting small towns and remote areas to quality doctors in the Karaganda region.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={initialLocale} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        <LanguageProvider initialLocale={initialLocale}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
