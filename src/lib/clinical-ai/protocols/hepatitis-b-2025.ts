export interface ClinicalFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  test: (input: PatientClinicalInput) => boolean;
}

export interface PatientClinicalInput {
  age?: number;
  birthDate?: Date;
  symptoms?: string;
  answers?: Record<string, string>;
}

function textMatches(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some(keyword => normalized.includes(keyword.toLowerCase()));
}

export const HEPATITIS_B_2025_PROTOCOL: ClinicalFactor[] = [
  {
    id: "F1_AGE",
    name: "Age Threshold",
    description: "Patient is 40 years of age or older",
    weight: 1.0,
    test: (input) => {
      let age = input.age;
      if (!age && input.birthDate) {
        const today = new Date();
        age = today.getFullYear() - input.birthDate.getFullYear();
        const m = today.getMonth() - input.birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < input.birthDate.getDate())) {
          age--;
        }
      }
      return !!(age && age >= 40);
    }
  },
  {
    id: "F2_JAUNDICE",
    name: "Jaundice Symptom Cluster",
    description: "Yellowing of skin or eyes, dark urine, or pale stools",
    weight: 3.0,
    test: (input) => {
      const keywords = [
        "jaundice", "yellow skin", "yellow eyes", "dark urine", "pale stool", "sclera",
        "желтуха", "желтые глаза", "желтая кожа", "темная моча", "белый стул",
        "сары ауру", "терінің сарғаюы", "зәрдің қараюы", "нәжістің ағаруы", "көздің сарғаюы"
      ];
      const symptomText = input.symptoms ?? "";
      const answersText = input.answers ? JSON.stringify(input.answers) : "";
      return textMatches(symptomText, keywords) || textMatches(answersText, keywords);
    }
  },
  {
    id: "F3_LIVER_PAIN",
    name: "RUQ / Liver Pain",
    description: "Pain in the right upper quadrant or liver area",
    weight: 1.5,
    test: (input) => {
      const keywords = [
        "liver pain", "right upper quadrant", "ruq", "under ribs", "liver area", "right side pain",
        "болит печень", "правое подреберье", "боль в правом боку", "под ребрами",
        "оң жақ қабырға", "бауыр тұсы", "бауырдың ауруы", "оң жақ бүйір"
      ];
      const symptomText = input.symptoms ?? "";
      const answersText = input.answers ? JSON.stringify(input.answers) : "";
      return textMatches(symptomText, keywords) || textMatches(answersText, keywords);
    }
  },
  {
    id: "F4_FAMILY_HISTORY",
    name: "Family History of Liver Disease",
    description: "Family history of liver cancer, cirrhosis, or hepatitis B",
    weight: 2.0,
    test: (input) => {
      const keywords = [
        "family history", "relative", "mother", "father", "parent", "brother", "sister", "hereditary", "genetics",
        "наследственность", "родственник", "мама", "папа", "отец", "мать", "брат", "сестра", "у родителей",
        "әке", "ана", "отбасы", "тұқым қуалайтын", "туыс", "ата-ана"
      ];
      const symptomText = input.symptoms ?? "";
      const answersText = input.answers ? JSON.stringify(input.answers) : "";
      const combines = symptomText + " " + answersText;
      
      // Must be paired with liver cancer, hepatitis, cirrhosis etc to make it a liver risk
      const liverTerms = [
        "liver", "hepatitis", "cancer", "cirrhosis", "hepb", "hbv",
        "печень", "гепатит", "рак", "цирроз",
        "бауыр", "ісік", "онкология"
      ];
      
      if (!textMatches(combines, keywords)) return false;
      return textMatches(combines, liverTerms);
    }
  },
  {
    id: "F5_EXPOSURE",
    name: "Non-Sterile / Surgical Exposure",
    description: "History of surgeries, dental procedures, blood transfusions, or tattoos in questionable settings",
    weight: 1.5,
    test: (input) => {
      const keywords = [
        "surgery", "operation", "dental", "dentist", "tattoo", "needle", "blood transfusion", "piercing",
        "операция", "стоматолог", "зубной", "тату", "игла", "инъекция", "переливание", "пирсинг",
        "ота", "хирургия", "тіс дәрігері", "татуировка", "ине", "қан құю"
      ];
      const symptomText = input.symptoms ?? "";
      const answersText = input.answers ? JSON.stringify(input.answers) : "";
      return textMatches(symptomText, keywords) || textMatches(answersText, keywords);
    }
  },
  {
    id: "F6_LAB_MARKERS",
    name: "Elevated Lab Markers",
    description: "Mentions of elevated ALT/AST enzymes or positive HBsAg status",
    weight: 2.5,
    test: (input) => {
      const keywords = [
        "alt", "ast", "hbsag", "hbv", "liver enzyme", "elevated transaminases",
        "алт", "аст", "печеночные ферменты", "положительный гепатит",
        "трансаминаза", "оң гепатит"
      ];
      const symptomText = input.symptoms ?? "";
      const answersText = input.answers ? JSON.stringify(input.answers) : "";
      return textMatches(symptomText, keywords) || textMatches(answersText, keywords);
    }
  }
];

export const HEPATOLOGY_TRIGGER_KEYWORDS = [
  "hepatitis", "jaundice", "liver", "biliary", "cirrhosis", "hbsag", "alt", "ast", "ascites", "hbv",
  "желтуха", "печень", "гепатит", "цирроз", "алт", "аст", "водянка",
  "сары ауру", "бауыр", "өт", "қан құю"
];
