import { CrawlerAdapter, CrawlResult, RawPriceRow } from "../adapter";
import { isCrawlAllowed, spaceRequest } from "../rate-limit";
import { chromium } from "playwright";

/**
 * KDL Olymp — laboratory price list.
 *
 * The previous URL (kdl.kz/prices) now redirects to the merged KDL Olymp
 * homepage and carries no prices, which is why this adapter produced nothing.
 * The live price list is /pricelist/<city> and is server-rendered.
 *
 * DOM contract this depends on (verified against the live page):
 *   a.analysis            one service
 *     .title              service name
 *     .price              "3 980 ₸"
 *     .category           section, e.g. "Гематология"
 *     .duration           "1 день" / "2 дня"
 *
 * robots.txt on this host allows everything (Disallow: is empty).
 */
export class KdlAdapter implements CrawlerAdapter {
  clinicName = "KDL Olymp";
  sourceUrl = "https://www.kdlolymp.kz/pricelist/astana";
  city = "Astana";

  async fetch(): Promise<CrawlResult> {
    const allowed = await isCrawlAllowed(this.sourceUrl);
    if (!allowed) {
      const note = `Crawling disallowed by robots.txt for ${this.sourceUrl}`;
      console.warn(`${note}. Using fallback dataset.`);
      return { rows: this.getFallbackData(), provenance: "FALLBACK", note };
    }

    let browser;
    try {
      await spaceRequest();
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(this.sourceUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector("a.analysis", { timeout: 15000 });

      // No named function declarations inside this callback: the bundler adds a
      // `__name` helper to them, which does not exist in the page context and
      // makes evaluate fail with "__name is not defined". Everything stays
      // inline for that reason.
      const parsed = await page.evaluate(() => {
        return [...document.querySelectorAll("a.analysis")].flatMap((el) => {
          const name = el.querySelector(".title")?.textContent?.trim() ?? "";
          const priceText = el.querySelector(".price")?.textContent ?? "";
          // "3 980 ₸" — strip non-breaking spaces and the currency mark.
          const price = parseInt(priceText.replace(/[^\d]/g, ""), 10);
          if (!name || !Number.isFinite(price) || price <= 0) return [];

          const durationText = el.querySelector(".duration")?.textContent ?? "";
          const days = parseInt(durationText.replace(/[^\d]/g, ""), 10);

          return [
            {
              serviceNameRaw: name,
              priceKzt: price,
              durationDays: Number.isFinite(days) && days > 0 ? days : undefined,
            },
          ];
        });
      });

      await browser.close();
      if (parsed.length > 0) return { rows: parsed, provenance: "LIVE" };
      throw new Error("a.analysis matched no rows — page structure changed");
    } catch (err) {
      const note = `KDL Olymp scrape failed: ${err instanceof Error ? err.message : String(err)}`;
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
      { serviceNameRaw: "Общий анализ крови (ОАК) с лейкоформулой", priceKzt: 2500, durationDays: 1 },
      { serviceNameRaw: "Общий анализ мочи (ОАМ) с микроскопией осадка", priceKzt: 1800, durationDays: 1 },
      { serviceNameRaw: "Аланинаминотрансфераза (АЛТ / ALT)", priceKzt: 1200, durationDays: 1 },
      { serviceNameRaw: "Аспартатаминотрансфераза (АСТ / AST)", priceKzt: 1200, durationDays: 1 },
      { serviceNameRaw: "Билирубин общий (Total Bilirubin)", priceKzt: 1300, durationDays: 1 },
      { serviceNameRaw: "Глюкоза в сыворотке крови", priceKzt: 1000, durationDays: 1 },
      { serviceNameRaw: "Гликированный гемоглобин HbA1c", priceKzt: 3500, durationDays: 2 },
      { serviceNameRaw: "Тиреотропный гормон (ТТГ / TSH)", priceKzt: 2800, durationDays: 1 },
    ];
  }
}
