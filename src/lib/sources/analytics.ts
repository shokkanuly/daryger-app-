import { db } from "@/lib/db";
import { fetchWithTimeout, TIMEOUTS } from "@/lib/http";

/**
 * Management summary over the consolidated layer.
 *
 * Gemini narrates figures that were already computed here — it never derives
 * them. Same division of labour as src/lib/clinical-ai/explain.ts: the numbers
 * come from the database, the language comes from the model, and losing the
 * model costs prose rather than correctness.
 */

export interface ConsolidationStats {
  totalRecords: number;
  subjects: number;
  bySystem: { system: string; records: number }[];
  openConflicts: number;
  conflictsByField: { field: string; count: number }[];
  /** Staff whose employment status disagrees between systems — the §01 headline risk. */
  staffStatusConflicts: number;
}

export async function gatherStats(): Promise<ConsolidationStats> {
  const [records, conflicts] = await Promise.all([
    db.consolidatedRecord.findMany({
      where: { isActive: true },
      select: { system: true, subjectRef: true },
    }),
    db.recordConflict.findMany({ where: { status: "OPEN" } }),
  ]);

  const bySystemMap = new Map<string, number>();
  for (const r of records) {
    bySystemMap.set(r.system, (bySystemMap.get(r.system) ?? 0) + 1);
  }

  const byFieldMap = new Map<string, number>();
  for (const c of conflicts) {
    byFieldMap.set(c.field, (byFieldMap.get(c.field) ?? 0) + 1);
  }

  return {
    totalRecords: records.length,
    subjects: new Set(records.map((r) => r.subjectRef)).size,
    bySystem: [...bySystemMap.entries()]
      .map(([system, count]) => ({ system, records: count }))
      .sort((a, b) => b.records - a.records),
    openConflicts: conflicts.length,
    conflictsByField: [...byFieldMap.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count),
    staffStatusConflicts: conflicts.filter(
      (c) => c.recordType === "staff" && c.field === "employmentStatus"
    ).length,
  };
}

/**
 * Deterministic summary used when Gemini is unavailable.
 *
 * Mirrors the offline fallback triage and clinical explanations already use, so
 * the panel degrades to plainer wording rather than an error.
 */
function templatedSummary(s: ConsolidationStats): string {
  const parts = [
    `Консолидировано ${s.totalRecords} записей по ${s.subjects} субъектам из ${s.bySystem.length} систем.`,
  ];

  if (s.openConflicts === 0) {
    parts.push("Расхождений между системами не обнаружено.");
  } else {
    parts.push(`Обнаружено ${s.openConflicts} расхождений между системами.`);
    const top = s.conflictsByField[0];
    if (top) parts.push(`Чаще всего расходится поле «${top.field}» (${top.count}).`);
  }

  if (s.staffStatusConflicts > 0) {
    parts.push(
      `Внимание: у ${s.staffStatusConflicts} сотрудник(ов) статус занятости различается между системами — ` +
        `возможен незакрытый доступ после увольнения.`
    );
  }

  return parts.join(" ");
}

export async function generateConsolidationSummary(
  stats: ConsolidationStats
): Promise<{ summary: string; source: "gemini" | "fallback" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: templatedSummary(stats), source: "fallback" };

  const prompt = `Ты — аналитический помощник руководителя поликлиники в Казахстане.
Ниже — уже посчитанные показатели консолидации данных из медицинских информационных систем.

${JSON.stringify(stats, null, 2)}

Напиши краткую сводку для руководителя на русском языке: 3-4 предложения.
Укажи главные управленческие риски, особенно расхождения в статусе сотрудников
(это означает незакрытые учётные записи после увольнения) и расхождения в данных пациентов.
Не придумывай цифры, которых нет в данных. Верни только текст, без JSON и markdown.`;

  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      },
      TIMEOUTS.EXTERNAL_API
    );

    if (!res.ok) return { summary: templatedSummary(stats), source: "fallback" };

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { summary: templatedSummary(stats), source: "fallback" };

    return { summary: text, source: "gemini" };
  } catch {
    return { summary: templatedSummary(stats), source: "fallback" };
  }
}
