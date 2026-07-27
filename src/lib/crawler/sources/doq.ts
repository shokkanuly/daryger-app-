import { CrawlerAdapter, CrawlResult, RawPriceRow } from "../adapter";
import { isCrawlAllowed, spaceRequest } from "../rate-limit";
import { chromium } from "playwright";

/**
 * doq.kz — clinic aggregator, consultation prices by specialty.
 *
 * The previous URL (doq.kz/services) is a 404, which is why this adapter never
 * produced anything. Prices live on /doctors/<city>/<specialty> pages, one card
 * per doctor.
 *
 * robots.txt disallows /appointments, /feedback and /map; the doctor listings
 * used here are permitted.
 *
 * DOM note: this site is Tailwind-built with no semantic class names, so cards
 * are located by the one stable hook available — the /doctor/ profile link —
 * and the price is read from the nearest element carrying a currency mark.
 * Utility classes would change on any rebuild.
 */
/**
 * URL slug -> the Russian name the service catalogue uses. Matching happens on
 * this string, so it has to read like a catalogue entry rather than a slug.
 */
const SPECIALTY_LABELS: Record<string, string> = {
  allergolog: "аллерголог",
  gastroenterolog: "гастроэнтеролог",
  endokrinolog: "эндокринолог",
  kardiolog: "кардиолог",
  nevrolog: "невролог",
  terapevt: "терапевт",
};

export class DoqAdapter implements CrawlerAdapter {
  clinicName = "Doq.kz";
  sourceUrl = "https://doq.kz/doctors/astana";
  city = "Astana";

  /** Specialties crawled. Kept small deliberately — each is a page fetch. */
  private readonly specialties = [
    "allergolog",
    "gastroenterolog",
    "endokrinolog",
    "kardiolog",
    "nevrolog",
    "terapevt",
  ];

  async fetch(): Promise<CrawlResult> {
    const allowed = await isCrawlAllowed(`${this.sourceUrl}/terapevt`);
    if (!allowed) {
      const note = `Crawling disallowed by robots.txt for ${this.sourceUrl}`;
      console.warn(`${note}. Using fallback dataset.`);
      return { rows: this.getFallbackData(), provenance: "FALLBACK", note };
    }

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const rows: RawPriceRow[] = [];

      for (const specialty of this.specialties) {
        // Delay between every request, per the ТЗ's rate-limit rule.
        await spaceRequest();

        const url = `${this.sourceUrl}/${specialty}`;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          await page.waitForSelector('a[href^="/doctor/"]', { timeout: 12000 });

          // Inline only — a named function here would be given a `__name`
          // helper by the bundler that does not exist in the page context.
          const prices = await page.evaluate(() => {
            // One card per doctor, keyed by profile href. Several links on a
            // card point at /doctor/ (the name and the reviews count), so
            // keying on href rather than link text avoids counting a doctor
            // twice and avoids "37 отзывов" being read as a name.
            const perDoctor = new Map<string, number>();

            for (const link of document.querySelectorAll('a[href^="/doctor/"]')) {
              const href = link.getAttribute("href") ?? "";
              if (!href || perDoctor.has(href)) continue;

              let card: HTMLElement | null = link as HTMLElement;
              for (let i = 0; i < 6 && card; i++) {
                if (card.textContent?.includes("\u20b8")) break;
                card = card.parentElement;
              }
              if (!card) continue;

              // Lowest price on the card: a struck-through original sits beside
              // the amount actually charged, and the payable one is smaller.
              const found = (card.textContent?.match(/(\d[\d\s\u00a0]{2,8})\s*\u20b8/g) ?? [])
                .map((s) => parseInt(s.replace(/[^\d]/g, ""), 10))
                .filter((n) => Number.isFinite(n) && n > 0);
              if (found.length === 0) continue;

              perDoctor.set(href, Math.min(...found));
            }

            return [...perDoctor.values()];
          });

          if (prices.length === 0) continue;

          // One row per specialty at the entry price. doq is an aggregator, so
          // per-doctor rows would all collapse under the same clinic anyway;
          // the "from" price is what a comparison view actually needs.
          rows.push({
            serviceNameRaw: `\u041a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0438\u044f: ${SPECIALTY_LABELS[specialty] ?? specialty}`,
            priceKzt: Math.min(...prices),
          });
        } catch (err) {
          // Source isolation at the page level too: one specialty failing must
          // not lose the specialties already collected.
          console.warn(
            `[doq] ${specialty} failed: ${err instanceof Error ? err.message : err}`
          );
        }
      }

      await browser.close();
      if (rows.length > 0) return { rows, provenance: "LIVE" };
      throw new Error("no doctor cards with prices matched on any specialty page");
    } catch (err) {
      const note = `Doq scrape failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`${note} (using fallback data)`);
      if (browser) await browser.close();
      return { rows: this.getFallbackData(), provenance: "FALLBACK", note };
    }
  }

  /**
   * Representative sample data, NOT scraped prices. Only returned when the live
   * scrape is impossible — callers must check `provenance` before treating
   * these as real. See CrawlProvenance in ../adapter.
   */
  private getFallbackData(): RawPriceRow[] {
    return [
      { serviceNameRaw: "Консультация терапевта", priceKzt: 8000 },
      { serviceNameRaw: "Консультация кардиолога", priceKzt: 12000 },
      { serviceNameRaw: "Консультация невролога", priceKzt: 11000 },
      { serviceNameRaw: "Консультация эндокринолога", priceKzt: 12000 },
      { serviceNameRaw: "Консультация гастроэнтеролога", priceKzt: 12000 },
    ];
  }
}
