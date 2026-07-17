import { db } from "@/lib/db";

export const CONFIDENCE_THRESHOLD = 0.70;

// Preprocessing raw names to clean up symbols and common typos
export function cleanRawName(rawName: string): string {
  let cleaned = rawName.toLowerCase().trim();

  // 1. Remove leading list numbers or SKU codes (e.g. "1.2.3. ", "A12.03.001 - ", etc)
  cleaned = cleaned.replace(/^[a-zA-Z0-9.-]*\d+[a-zA-Z0-9.-]*\s+/, "");
  // Remove standalone billing/procedure codes like "ВОЗ", "В02", "В03", "B06", "B01", "B04"
  cleaned = cleaned.replace(/\b(воз|во|в\d+|во\d+|в|а\d+|б\d+)\b/g, "");

  // 2. Normalize common OCR errors
  cleaned = cleaned.replace(/\b(ajit|ajlt|аjiт|алт)\b/g, "алт");
  cleaned = cleaned.replace(/\b(act|acm|аст)\b/g, "аст");
  cleaned = cleaned.replace(/оак/g, "оак");
  cleaned = cleaned.replace(/оам/g, "оам");

  // 3. Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function getWords(text: string): string[] {
  // Medical stop words that shouldn't impact main classification overlap
  const stopWords = new Set([
    "в", "на", "и", "для", "у", "с", "из", "по", "о", "об", "при", "за",
    "исследование", "определение", "метод", "взятие", "забор", "материала", 
    "анализ", "соскоба", "посещение", "видеозвонок"
  ]);
  return text
    .split(/[^a-zA-Z0-9а-яА-ЯёЁ]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 1 && !stopWords.has(w));
}

/**
 * Calculates string similarity using normalized Levenshtein distance
 */
function getSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;

  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return 1.0 - distance / maxLength;
}

/**
 * standard matchService algorithm: Exact -> Synonym -> Token Overlap -> Fuzzy
 */
let cachedServices: any[] | null = null;
let lastCacheTime = 0;

export async function matchService(rawName: string): Promise<{ serviceId: string | null; confidence: number }> {
  const now = Date.now();
  if (!cachedServices || (now - lastCacheTime > 300000)) { // Cache for 5 mins
    const servicesFromDb = await db.service.findMany({ where: { isActive: true } });
    cachedServices = servicesFromDb.map(s => {
      const cleanedName = cleanRawName(s.name);
      return {
        id: s.id,
        name: s.name,
        cleanedName,
        nameWords: getWords(cleanedName),
        synonyms: s.synonyms.map(syn => {
          const cleanedSyn = cleanRawName(syn);
          return {
            original: syn,
            cleaned: cleanedSyn,
            words: getWords(cleanedSyn)
          };
        })
      };
    });
    lastCacheTime = now;
  }
  
  const services = cachedServices;
  const cleanedRaw = cleanRawName(rawName);
  
  if (!cleanedRaw) {
    return { serviceId: null, confidence: 0 };
  }

  const rawWords = getWords(cleanedRaw);

  // 1. Direct Abbreviation Matches (highest priority)
  if (rawWords.includes("оак")) {
    const s = services.find(x => x.name === "Complete Blood Count (CBC)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("оам")) {
    const s = services.find(x => x.name === "Urinalysis (UA)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("алт")) {
    const s = services.find(x => x.name === "Alanine Aminotransferase (ALT)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("аст")) {
    const s = services.find(x => x.name === "Aspartate Aminotransferase (AST)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("ттг")) {
    const s = services.find(x => x.name === "Thyroid Stimulating Hormone (TSH)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("экг")) {
    const s = services.find(x => x.name === "Electrocardiogram (ECG)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("фгдс") || rawWords.includes("гастроскопия") || rawWords.includes("эгдс")) {
    const s = services.find(x => x.name === "Gastroscopy (EGD)");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("мрт") && (rawWords.includes("мозг") || rawWords.includes("головы"))) {
    const s = services.find(x => x.name === "Brain MRI");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }
  if (rawWords.includes("мрт") && (rawWords.includes("поясницы") || rawWords.includes("поясничного"))) {
    const s = services.find(x => x.name === "Lumbar Spine MRI");
    if (s) return { serviceId: s.id, confidence: 1.0 };
  }

  // 2. Exact match on cleaned string
  for (const s of services) {
    if (s.cleanedName === cleanedRaw) {
      return { serviceId: s.id, confidence: 1.0 };
    }
    for (const syn of s.synonyms) {
      if (syn.cleaned === cleanedRaw) {
        return { serviceId: s.id, confidence: 1.0 };
      }
    }
  }

  // 3. Word Overlap / Intersection Match (highly effective for long raw names)
  let bestServiceId: string | null = null;
  let bestConfidence = 0.0;

  for (const s of services) {
    for (const syn of s.synonyms) {
      const synWords = syn.words;
      if (synWords.length === 0) continue;

      // Count intersection
      const intersection = synWords.filter(w => rawWords.includes(w));
      const overlapRatio = intersection.length / synWords.length;

      // If all words from synonym are present in rawName, high score!
      if (overlapRatio === 1.0) {
        const confidence = 0.90 + (synWords.length * 0.01);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestServiceId = s.id;
        }
      } else if (overlapRatio > 0.6) {
        // partial overlap
        const score = overlapRatio * 0.8;
        if (score > bestConfidence) {
          bestConfidence = score;
          bestServiceId = s.id;
        }
      }
    }
  }

  // Return immediately if we found a very strong overlap match
  if (bestConfidence >= 0.90) {
    return { serviceId: bestServiceId, confidence: Number(bestConfidence.toFixed(2)) };
  }

  // 4. Fuzzy Levenshtein Fallback (only on candidate services that share AT LEAST one key word)
  if (bestConfidence < CONFIDENCE_THRESHOLD) {
    for (const s of services) {
      // Check if sharing at least one word to save CPU cycles
      const hasWordOverlap = s.nameWords.some(w => rawWords.includes(w)) || 
                             s.synonyms.some(syn => syn.words.some(w => rawWords.includes(w)));
                             
      if (!hasWordOverlap) continue;

      const nameSim = getSimilarity(cleanedRaw, s.name);
      if (nameSim > bestConfidence) {
        bestConfidence = nameSim;
        bestServiceId = s.id;
      }

      for (const syn of s.synonyms) {
        const synSim = getSimilarity(cleanedRaw, syn.original);
        if (synSim > bestConfidence) {
          bestConfidence = synSim;
          bestServiceId = s.id;
        }
      }
    }
  }

  const confidence = Number(bestConfidence.toFixed(2));
  if (confidence >= CONFIDENCE_THRESHOLD) {
    return { serviceId: bestServiceId, confidence };
  }

  return { serviceId: null, confidence };
}
