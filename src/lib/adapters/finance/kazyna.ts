import {
  FinanceSourceAdapter,
  FinanceRow,
  parseCsv,
  periodOf,
} from "./types";

/**
 * Казына — казначейская система исполнения бюджета.
 *
 * MOCK EXPORT. Production would read the treasury export from
 * process.env.KAZYNA_EXPORT_DIR. No credentials or exports are available to
 * this project.
 */
export class KazynaAdapter implements FinanceSourceAdapter {
  source = "KAZYNA" as const;
  label = "Казына";

  parseExport(csv: string): FinanceRow[] {
    return parseCsv(csv).flatMap((r) => {
      const amount = Number(String(r["Сумма"] ?? "").replace(/\s/g, "").replace(",", "."));
      const date = new Date(r["Дата"] ?? "");
      if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) return [];
      return [
        {
          externalId: r["Платёж"] ?? `KZ-${date.toISOString()}-${amount}`,
          category: r["Статья"] ?? "Прочее",
          amount,
          recordedAt: date,
          period: periodOf(date),
          raw: r,
        },
      ];
    });
  }

  sampleExport(): FinanceRow[] {
    const rows: [string, string, number, string][] = [
      ["KZ-2026-Q3-7001", "Амбулаторно-поликлиническая помощь", 48_500_000, "2026-07-06"],
      ["KZ-2026-Q3-7002", "Лекарственное обеспечение", 21_400_000, "2026-07-19"],
      ["KZ-2026-Q3-7003", "Оплата труда", 96_800_000, "2026-07-25"],
      ["KZ-2026-Q3-7004", "Лабораторная диагностика", 8_750_000, "2026-07-13"],
    ];
    return rows.map(([externalId, category, amount, d]) => {
      const recordedAt = new Date(d);
      return {
        externalId,
        category,
        amount,
        recordedAt,
        period: periodOf(recordedAt),
        raw: { "Платёж": externalId, Статья: category, Сумма: amount, Дата: d },
      };
    });
  }
}
