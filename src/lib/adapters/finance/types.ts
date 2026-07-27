/**
 * Finance source adapters — MedHub task 5 (единая финплатформа).
 *
 * ⚠️ NOT WORKING INTEGRATIONS. ЕСОМП, Казына, 1С, the procurement portal and
 * ФСМС contract data are not reachable from this project, and in practice a
 * clinic accesses most of them as periodic spreadsheet exports rather than an
 * API. Each adapter therefore parses an uploaded export; the mock generators
 * below stand in for a real one during development.
 *
 * Same shape as the appeal and source-system adapters so all three read alike.
 */

export type FinanceSourceName =
  | "ESOMP"
  | "KAZYNA"
  | "ONEC_FIN"
  | "GOSZAKUP"
  | "FSMS";

export interface FinanceRow {
  externalId: string;
  category: string;
  amount: number;
  recordedAt: Date;
  /** Planning bucket, e.g. "2026-Q3". */
  period: string;
  raw: Record<string, unknown>;
}

export interface FinanceSourceAdapter {
  source: FinanceSourceName;
  label: string;
  /** Parses an export this system produces. */
  parseExport(csv: string): FinanceRow[];
  /** Representative rows for development, standing in for a real export. */
  sampleExport(): FinanceRow[];
}

/** Quarter label for a date, e.g. 2026-07-14 -> "2026-Q3". */
export function periodOf(d: Date): string {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/**
 * Minimal CSV reader for operator-uploaded exports.
 *
 * Deliberately small rather than a CSV library: these exports are
 * machine-generated, single-encoding, and have no embedded newlines. Quoted
 * fields are handled because Russian category names contain commas.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Doubled quote inside a quoted field is a literal quote.
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if ((ch === "," || ch === ";") && !quoted) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}
