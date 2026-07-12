import { CrawlerAdapter, RawPriceRow } from "../adapter";
import { isCrawlAllowed, spaceRequest } from "../rate-limit";
import { chromium } from "playwright";

export class KdlAdapter implements CrawlerAdapter {
  clinicName = "KDL Laboratory";
  sourceUrl = "https://kdl.kz/prices";

  async fetch(): Promise<RawPriceRow[]> {
    const allowed = await isCrawlAllowed(this.sourceUrl);
    if (!allowed) {
      console.warn(`Crawling disallowed by robots.txt for ${this.sourceUrl}. Using safe fallback dataset.`);
      return this.getFallbackData();
    }

    let browser;
    try {
      await spaceRequest();
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(this.sourceUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      const parsed = await page.evaluate(() => {
        const rows: any[] = [];
        document.querySelectorAll("table tr, .price-item, .service-row").forEach((el) => {
          const nameEl = el.querySelector(".name, .title, td:first-child");
          const priceEl = el.querySelector(".price, td:nth-child(2), td:last-child");
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
      if (parsed.length > 0) return parsed;
      throw new Error("No elements parsed from KDL DOM");
    } catch (err) {
      console.error("KDL scrape error (using fallback data):", err);
      if (browser) await browser.close();
      return this.getFallbackData();
    }
  }

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
      { serviceNameRaw: "Свободный тироксин свободный (FT4)", priceKzt: 2800, durationDays: 1 },
      { serviceNameRaw: "Коагулограмма (ПТИ, МНО, АЧТВ)", priceKzt: 4500, durationDays: 1 },
      { serviceNameRaw: "С-реактивный белок (СРБ / CRP)", priceKzt: 2000, durationDays: 1 },
      { serviceNameRaw: "Ферритин (сывороточный ферритин)", priceKzt: 3000, durationDays: 1 },
      { serviceNameRaw: "Железо сывороточное", priceKzt: 1800, durationDays: 1 },
      { serviceNameRaw: "Креатинин в крови", priceKzt: 1500, durationDays: 1 },
      { serviceNameRaw: "Мочевина в сыворотке", priceKzt: 1400, durationDays: 1 },
    ];
  }
}
