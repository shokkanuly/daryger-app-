import { CrawlerAdapter, CrawlResult, RawPriceRow } from "../adapter";
import { isCrawlAllowed, spaceRequest } from "../rate-limit";
import { chromium } from "playwright";

export class InvitroAdapter implements CrawlerAdapter {
  clinicName = "Invitro Clinic";
  sourceUrl = "https://invitro.kz/analizes";

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
      await page.goto(this.sourceUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      const parsed = await page.evaluate(() => {
        const rows: any[] = [];
        document.querySelectorAll("table tr, .invitro-item, .price-list-row").forEach((el) => {
          const nameEl = el.querySelector(".item-name, .title, td:first-child");
          const priceEl = el.querySelector(".item-price, td:nth-child(2), td:last-child");
          if (nameEl && priceEl) {
            const name = nameEl.textContent?.trim() || "";
            const price = parseInt(priceEl.textContent?.replace(/[^0-9]/g, "") || "0");
            if (name && price > 0) {
              rows.push({ serviceNameRaw: name, priceKzt: price });
            }
          }
        });
        return rows;
      });

      await browser.close();
      if (parsed.length > 0) return { rows: parsed, provenance: "LIVE" };
      throw new Error("No elements parsed from Invitro DOM");
    } catch (err) {
      const note = `Invitro scrape failed: ${err instanceof Error ? err.message : String(err)}`;
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
      { serviceNameRaw: "Клинический анализ крови (с лейкоцитарной формулой)", priceKzt: 2700, durationDays: 1 },
      { serviceNameRaw: "Анализ мочи общий (с микроскопией осадка)", priceKzt: 1900, durationDays: 1 },
      { serviceNameRaw: "АлАт (Аланинаминотрансфераза)", priceKzt: 1300, durationDays: 1 },
      { serviceNameRaw: "АсАт (Аспартатаминотрансфераза)", priceKzt: 1300, durationDays: 1 },
      { serviceNameRaw: "Билирубин общий (Serum Bilirubin)", priceKzt: 1400, durationDays: 1 },
      { serviceNameRaw: "Глюкоза (в крови)", priceKzt: 1100, durationDays: 1 },
      { serviceNameRaw: "ТТГ (Тиреотропный гормон, ультрачувствительный)", priceKzt: 2900, durationDays: 1 },
      { serviceNameRaw: "Свободный Т4 (тироксин свободный)", priceKzt: 2900, durationDays: 1 },
      { serviceNameRaw: "С-реактивный белок (СРБ, количественно)", priceKzt: 2200, durationDays: 1 },
      { serviceNameRaw: "Витамин 25-OH D (кальциферол)", priceKzt: 12000, durationDays: 2 },
      { serviceNameRaw: "Липидограмма крови (Липидный профиль)", priceKzt: 5000, durationDays: 1 },
      { serviceNameRaw: "Мочевая кислота в сыворотке", priceKzt: 1600, durationDays: 1 },
      { serviceNameRaw: "Мочевина сыворотки", priceKzt: 1500, durationDays: 1 },
      { serviceNameRaw: "Креатинин сыворотки крови", priceKzt: 1600, durationDays: 1 },
      { serviceNameRaw: "Витамин В12 (цианокобаламин)", priceKzt: 4000, durationDays: 2 },
    ];
  }
}
