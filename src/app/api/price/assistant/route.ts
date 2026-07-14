import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RATES: Record<string, number> = { USD: 450, RUB: 5, EUR: 500, KZT: 1 };

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "AI assistant unavailable" }, { status: 503 });
    }

    // ── 1. Call Gemini to analyse symptoms ─────────────────────────────────
    const prompt = `Ты — медицинский ИИ-ассистент MedServicePrice.kz.
Пациент описывает жалобу: "${message}"

1. Кратко проанализируй жалобу на русском языке (2-3 предложения).
2. Дай 2-4 конкретные рекомендации (например: «Сдать ОАК», «Записаться к неврологу»).
3. Выдели 2-3 коротких поисковых запроса для нашей базы прайс-листов (на русском, например: ["узи брюшной полости", "прием невролога", "общий анализ крови"]).

Отвечай СТРОГО в формате JSON:
{
  "analysis": "...",
  "recommendations": ["...", "..."],
  "search_queries": ["...", "..."]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: "AI service error" }, { status: 503 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: { analysis: string; recommendations: string[]; search_queries: string[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Best-effort extraction if Gemini added markdown fences
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { analysis: rawText, recommendations: [], search_queries: [] };
    }

    const { analysis, recommendations, search_queries } = parsed;

    // ── 2. Search price catalog for each query ─────────────────────────────
    const seenServiceIds = new Set<string>();
    const services: any[] = [];

    for (const q of (search_queries ?? []).slice(0, 3)) {
      const qLower = q.toLowerCase().trim();

      // Match against standard catalog
      const allServices = await db.service.findMany({ where: { isActive: true } });
      const matchedIds = allServices
        .filter(
          (s) =>
            s.name.toLowerCase().includes(qLower) ||
            s.synonyms.some((syn) => syn.toLowerCase().includes(qLower))
        )
        .map((s) => s.id);

      const records = await db.priceRecord.findMany({
        where: {
          isActive: true,
          OR: [
            { serviceNameRaw: { contains: q, mode: "insensitive" } },
            ...(matchedIds.length > 0 ? [{ serviceId: { in: matchedIds } }] : []),
          ],
        },
        include: { clinic: true, service: true },
        orderBy: { priceKzt: "asc" },
        take: 6,
      });

      for (const rec of records) {
        const key = rec.serviceId ?? `raw:${rec.serviceNameRaw}`;
        if (seenServiceIds.has(key)) continue;
        seenServiceIds.add(key);
        services.push({
          serviceId: rec.serviceId,
          serviceName: rec.service?.name ?? rec.serviceNameRaw,
          clinicName: rec.clinic.name,
          clinicCity: rec.clinic.city,
          priceKzt: Number(rec.priceKzt),
          currency: "KZT",
        });
      }
    }

    return NextResponse.json({ analysis, recommendations, services });
  } catch (err: any) {
    console.error("Assistant error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
