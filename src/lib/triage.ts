export interface TriageQuestion {
  id: string;
  question: string;
  questionKk: string;
  options: { value: string; label: string; labelKk: string; urgency?: number }[];
}

export const TRIAGE_QUESTIONS: TriageQuestion[] = [
  {
    id: "chief_complaint",
    question: "What is your main concern today?",
    questionKk: "Бүгін неге шағымданасыз?",
    options: [
      { value: "fever", label: "Fever / Cold symptoms", labelKk: "Қызу / Суық тию", urgency: 2 },
      { value: "pain", label: "Pain or injury", labelKk: "Ауырсыну немесе жарақат", urgency: 3 },
      { value: "chronic", label: "Chronic condition follow-up", labelKk: "Созылмалы ауру бақылауы", urgency: 1 },
      { value: "child", label: "Child health concern", labelKk: "Бала денсаулығы", urgency: 3 },
      { value: "mental", label: "Mental health / anxiety", labelKk: "Психикалық денсаулық", urgency: 2 },
      { value: "other", label: "Other", labelKk: "Басқа", urgency: 2 },
    ],
  },
  {
    id: "duration",
    question: "How long have you had these symptoms?",
    questionKk: "Белгілер қанша уақыттан бері?",
    options: [
      { value: "today", label: "Started today", labelKk: "Бүгін басталды", urgency: 1 },
      { value: "days", label: "2–3 days", labelKk: "2–3 күн", urgency: 2 },
      { value: "week", label: "About a week", labelKk: "Шамамен бір апта", urgency: 2 },
      { value: "long", label: "More than 2 weeks", labelKk: "2 аптадан астам", urgency: 3 },
    ],
  },
  {
    id: "severity",
    question: "How severe are your symptoms?",
    questionKk: "Белгілеріңіз қаншалықты ауыр?",
    options: [
      { value: "mild", label: "Mild — manageable at home", labelKk: "Жеңіл — үйде басқаруға болады", urgency: 1 },
      { value: "moderate", label: "Moderate — affecting daily life", labelKk: "Орташа — күнделікті өмірге әсер етеді", urgency: 2 },
      { value: "severe", label: "Severe — significant discomfort", labelKk: "Ауыр — айтарлықтай ыңғайсыздық", urgency: 4 },
      { value: "emergency", label: "Emergency — need immediate help", labelKk: "Шұғыл — дереу көмек керек", urgency: 5 },
    ],
  },
];

export const KARAGANDA_TOWNS = [
  "Karaganda",
  "Shakhtinsk",
  "Temirtau",
  "Abay",
  "Saran",
  "Satbayev",
  "Karkaraly",
  "Balkhash",
  "Priozersk",
];

export function calculateUrgency(answers: Record<string, string>): "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY" {
  let score = 0;
  for (const q of TRIAGE_QUESTIONS) {
    const answer = answers[q.id];
    const option = q.options.find((o) => o.value === answer);
    if (option?.urgency) score += option.urgency;
  }
  if (score >= 10) return "EMERGENCY";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

export function getComplaintLabel(value: string) {
  const q = TRIAGE_QUESTIONS[0];
  return q.options.find((o) => o.value === value)?.label ?? value;
}
