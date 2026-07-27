import {
  FinanceSourceAdapter,
  FinanceRow,
  parseCsv,
  periodOf,
} from "./types";

/**
 * ЕСОМП — единая система обязательного медицинского страхования.
 *
 * MOCK EXPORT. A real deployment would drop the ЕСОМП quarterly export into
 * process.env.ESOMP_EXPORT_DIR, or an operator uploads it through
 * /admin/finance. No credentials or exports are available to this project.
 *
 * Column names below match the export layout ЕСОМП produces.
 */
export class EsompAdapter implements FinanceSourceAdapter {
  source = "ESOMP" as const;
  label = "ЕСОМП";

  parseExport(csv: string): FinanceRow[] {
    return parseCsv(csv).flatMap((r) => {
      const amount = Number(String(r["Сумма"] ?? "").replace(/\s/g, "").replace(",", "."));
      const date = new Date(r["Дата"] ?? "");
      if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) return [];
      return [
        {
          externalId: r["Номер"] ?? `ESOMP-${date.toISOString()}-${amount}`,
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
      // Three prior quarters, so the moving-average forecast has real history
      // to average rather than copying a single quarter forward.
      ["ESOMP-2025-Q4-001", "Амбулаторно-поликлиническая помощь", 41_200_000, "2025-10-08"],
      ["ESOMP-2025-Q4-002", "Лабораторная диагностика", 7_100_000, "2025-11-14"],
      ["ESOMP-2025-Q4-003", "Лекарственное обеспечение", 18_900_000, "2025-12-02"],
      ["ESOMP-2026-Q1-001", "Амбулаторно-поликлиническая помощь", 44_800_000, "2026-01-15"],
      ["ESOMP-2026-Q1-002", "Лабораторная диагностика", 7_900_000, "2026-02-11"],
      ["ESOMP-2026-Q1-003", "Лекарственное обеспечение", 19_600_000, "2026-03-04"],
      ["ESOMP-2026-Q2-001", "Амбулаторно-поликлиническая помощь", 46_100_000, "2026-04-09"],
      ["ESOMP-2026-Q2-002", "Лабораторная диагностика", 8_300_000, "2026-05-20"],
      ["ESOMP-2026-Q2-003", "Лекарственное обеспечение", 20_500_000, "2026-06-16"],

      // Current quarter.
      ["ESOMP-2026-Q3-001", "Амбулаторно-поликлиническая помощь", 48_500_000, "2026-07-05"],
      ["ESOMP-2026-Q3-002", "Стационарозамещающая помощь", 12_300_000, "2026-07-05"],
      ["ESOMP-2026-Q3-003", "Лабораторная диагностика", 8_750_000, "2026-07-12"],
      ["ESOMP-2026-Q3-004", "Лекарственное обеспечение", 21_400_000, "2026-07-18"],
      // This one is never reported by 1С — reconciliation should flag it.
      ["ESOMP-2026-Q3-005", "Скрининговые обследования", 6_200_000, "2026-07-20"],
    ];
    return rows.map(([externalId, category, amount, d]) => {
      const recordedAt = new Date(d);
      return {
        externalId,
        category,
        amount,
        recordedAt,
        period: periodOf(recordedAt),
        raw: { Номер: externalId, Статья: category, Сумма: amount, Дата: d },
      };
    });
  }
}
