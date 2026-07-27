import { ClinicalFactor } from "./protocols/hepatitis-b-2025";
import { fetchWithTimeout, TIMEOUTS } from "@/lib/http";

export async function generateExplanation(
  score: number,
  flags: { factorId: string; name: string; description: string; weight: number }[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return getDefaultFallback(score, flags);
  }

  const prompt = `You are a clinical decision support assistant AI. A patient has been assessed for Hepatitis B risk.
The clinical protocol flags that fired are:
${JSON.stringify(flags, null, 2)}

The total computed risk score is ${score}.

Provide a concise, clear clinical explanation in Russian (the medical standard in the Karaganda region) detailing why the patient is flagged for risk.
Explain what these factors mean clinically. Keep it to 3-4 sentences maximum. Speak to the clinician as a professional colleague. Do not return any JSON wrappers or markdown code blocks; return the text directly.`;

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
          },
        }),
      },
      TIMEOUTS.EXTERNAL_API
    );

    if (!response.ok) {
      console.warn("Gemini API error in clinical explain, using fallback.");
      return getDefaultFallback(score, flags);
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return explanation || getDefaultFallback(score, flags);
  } catch (err) {
    console.error("Error generating Gemini explanation:", err);
    return getDefaultFallback(score, flags);
  }
}

function getDefaultFallback(
  score: number,
  flags: { factorId: string; name: string; description: string; weight: number }[]
): string {
  const factorLines = flags
    .map((f) => `• ${f.name} (вес: ${f.weight}): ${f.description}`)
    .join("\n");
  return `Пояснение ИИ недоступно (отсутствует подключение). Факторы риска на основе клинического протокола:\n${factorLines}`;
}
