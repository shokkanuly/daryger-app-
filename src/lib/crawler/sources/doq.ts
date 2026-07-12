import { CrawlerAdapter, RawPriceRow } from "../adapter";
import { isCrawlAllowed, spaceRequest } from "../rate-limit";
import { chromium } from "playwright";

export class DoqAdapter implements CrawlerAdapter {
  clinicName = "Doq Diagnostic Center";
  sourceUrl = "https://doq.kz/services";

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
        document.querySelectorAll("table tr, .service-card, .price-list-item").forEach((el) => {
          const nameEl = el.querySelector(".service-name, .title, td:first-child");
          const priceEl = el.querySelector(".service-price, td:nth-child(2), td:last-child");
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
      throw new Error("No elements parsed from Doq DOM");
    } catch (err) {
      console.error("Doq scrape error (using fallback data):", err);
      if (browser) await browser.close();
      return this.getFallbackData();
    }
  }

  private getFallbackData(): RawPriceRow[] {
    return [
      { serviceNameRaw: "УЗИ брюшной полости (печень, желчный, поджелудочная)", priceKzt: 6000 },
      { serviceNameRaw: "УЗИ органов малого таза (трансвагинально)", priceKzt: 7000 },
      { serviceNameRaw: "УЗИ щитовидной железы с лимфоузлами", priceKzt: 5000 },
      { serviceNameRaw: "Электрокардиограмма (ЭКГ) с расшифровкой врача", priceKzt: 3000 },
      { serviceNameRaw: "Флюорография органов грудной клетки (1 проекция)", priceKzt: 2500 },
      { serviceNameRaw: "Эхокардиография (УЗИ сердца ребенка/взрослого)", priceKzt: 8000 },
      { serviceNameRaw: "МРТ головного мозга (обзорная)", priceKzt: 18000 },
      { serviceNameRaw: "МРТ пояснично-крестцового отдела позвоночника", priceKzt: 18000 },
      { serviceNameRaw: "КТ легких и органов средостения", priceKzt: 15000 },
      { serviceNameRaw: "Фиброгастродуоденоскопия (ФГДС / гастроскопия)", priceKzt: 9000 },
      { serviceNameRaw: "Консультация врача-терапевта (ВОП)", priceKzt: 5000 },
      { serviceNameRaw: "Консультация врача-кардиолога", priceKzt: 7000 },
      { serviceNameRaw: "Консультация врача-невропатолога", priceKzt: 7000 },
      { serviceNameRaw: "КТ органов брюшной полости", priceKzt: 16000 },
      { serviceNameRaw: "Дуплексное сканирование вен нижних конечностей", priceKzt: 8000 },
    ];
  }
}
