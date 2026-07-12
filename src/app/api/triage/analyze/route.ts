import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

interface TriageAnalysis {
  urgency: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  concerns: string[];
  specialist: string;
  summary: string;
}

// Deterministic fallback when GEMINI_API_KEY is not set
function mockAnalysis(answers: Record<string, string>, symptoms: string): TriageAnalysis {
  const text = `${symptoms} ${Object.values(answers).join(" ")}`.toLowerCase();
  const urgency =
    text.includes("emergency") || text.includes("шұғыл") ? "EMERGENCY"
    : text.includes("severe") || text.includes("chest") || text.includes("blood") ? "HIGH"
    : text.includes("moderate") || text.includes("pain") ? "MEDIUM"
    : "LOW";
  return {
    urgency,
    concerns: ["Symptom pattern suggests monitoring required", "Rule out acute conditions"],
    specialist: text.includes("child") || text.includes("бала") ? "Pediatrician" : "General Practitioner",
    summary: "AI analysis unavailable (no API key). Rule-based urgency applied. Doctor should assess directly.",
  };
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answers, symptoms } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(mockAnalysis(answers, symptoms ?? ""));
  }

  const prompt = `You are a medical triage assistant AI for Daryger, a telemedicine platform in the Karaganda region of Kazakhstan.

A patient has completed a triage questionnaire. Analyze their answers and symptoms to produce a structured triage assessment for the reviewing doctor.

Triage Answers:
${JSON.stringify(answers, null, 2)}

Free-text symptoms:
${symptoms || "(not provided)"}

Provide your assessment as JSON matching exactly this schema. Do not add any explanation outside the JSON.`;

  try {
    // gemini-2.5-flash — confirmed stable as of July 2026
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // Schema-enforced JSON mode — not a prompt instruction, enforced at API level
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                urgency: {
                  type: "STRING",
                  enum: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"],
                  description: "Overall urgency level based on symptom severity",
                },
                concerns: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "List of specific clinical concerns flagged, 2-4 items",
                },
                specialist: {
                  type: "STRING",
                  description: "Recommended specialist type (e.g. General Practitioner, Pediatrician)",
                },
                summary: {
                  type: "STRING",
                  description: "One-sentence plain-language triage summary for the doctor",
                },
              },
              required: ["urgency", "concerns", "specialist", "summary"],
            },
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return NextResponse.json(mockAnalysis(answers, symptoms ?? ""));
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Parse response — with responseMimeType=application/json this should always be valid JSON
    const analysis: TriageAnalysis = JSON.parse(text);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Gemini triage error:", err);
    return NextResponse.json(mockAnalysis(answers, symptoms ?? ""));
  }
}
