import {
  FinanceSourceAdapter,
  FinanceRow,
  parseCsv,
  periodOf,
} from "./types";

/**
 * 1С — бухгалтерский учёт.
 *
 * MOCK EXPORT. 1С is normally reachable only through a scheduled export, so a
 * production adapter reads the file rather than calling a service. No exports
 * are available to this project.
 *
 * The sample below deliberately disagrees with ЕСОМП in two ways — one amount
 * mismatch and one missing record — because catching exactly that is task 8.
 */
export class OnecFinanceAdapter implements FinanceSourceAdapter {
  source = "ONEC_FIN" as const;
  label = "1С";

  parseExport(csv: string): FinanceRow[] {
    return parseCsv(csv).flatMap((r) => {
      const amount = Number(String(r["Сумма"] ?? "").replace(/\s/g, "").replace(",", "."));
      const date = new Date(r["Дата"] ?? "");
      if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) return [];
      return [
        {
          externalId: r["Документ"] ?? `1C-${date.toISOString()}-${amount}`,
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
      ["ESOMP-2026-Q3-001", "Амбулаторно-поликлиническая помощь", 48_500_000, "2026-07-05"],
      ["ESOMP-2026-Q3-002", "Стационарозамещающая помощь", 12_300_000, "2026-07-05"],
      // Differs from ЕСОМП by 1 250 000 ₸ — an amount mismatch.
      ["ESOMP-2026-Q3-003", "Лабораторная диагностика", 7_500_000, "2026-07-12"],
      ["ESOMP-2026-Q3-004", "Лекарственное обеспечение", 21_400_000, "2026-07-18"],
      // ESOMP-2026-Q3-005 intentionally absent — a record 1С never received.
      ["1C-2026-Q3-101", "Коммунальные услуги", 3_100_000, "2026-07-08"],
    ];
    return rows.map(([externalId, category, amount, d]) => {
      const recordedAt = new Date(d);
      return {
        externalId,
        category,
        amount,
        recordedAt,
        period: periodOf(recordedAt),
        raw: { Документ: externalId, Статья: category, Сумма: amount, Дата: d },
      };
    });
  }
}
