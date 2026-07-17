import { db } from "@/lib/db";

export const CONFIDENCE_THRESHOLD = 0.70;

// Preprocessing raw names to clean up symbols and common typos
export function cleanRawName(rawName: string): string {
  let cleaned = rawName.toLowerCase().trim();

  // 1. Remove leading list numbers or SKU codes (e.g. "1.2.3. ", "A12.03.001 - ")
  cleaned = cleaned.replace(/^[a-zA-Z0-9.-]*\d+[a-zA-Z0-9.-]*\s+/, "");
  // Remove standalone billing/procedure codes like "ВОЗ", "В02", "В03", "B06"
  cleaned = cleaned.replace(/\b(воз|во|в\d+|во\d+|а\d+|б\d+)\b/g, "");

  // 2. Normalize common OCR errors
  cleaned = cleaned.replace(/\b(ajit|ajlt|аjiт)\b/g, "алт");
  cleaned = cleaned.replace(/\b(acm|acт)\b/g, "аст");

  // 3. Normalize hyphen-joined words (e.g "аллерголог-иммунолог" -> space separated)
  cleaned = cleaned.replace(/-/g, " ");

  // 4. Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

// Medical stop words that shouldn't impact main classification overlap
const STOP_WORDS = new Set([
  "в", "на", "и", "для", "у", "с", "из", "по", "о", "об", "при", "за", "не",
  "или", "но", "да", "же",
]);

// Words that are STRUCTURAL rather than identifying (not as strong as stop words, but should be deprioritized)
const WEAK_WORDS = new Set([
  "исследование", "определение", "метод", "взятие", "забор", "материала",
  "анализ", "соскоба", "посещение", "видеозвонок", "прием", "консультация",
  "первичная", "повторная", "первичный", "повторный",
]);

function getWords(text: string, includeWeak = false): string[] {
  return text
    .split(/[^a-zA-Z0-9а-яА-ЯёЁ]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w) && (includeWeak || !WEAK_WORDS.has(w)));
}

function getWeakWords(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9а-яА-ЯёЁ]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
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

  // Skip very long comparisons (perf guard - Levenshtein is O(n*m))
  if (len1 > 80 || len2 > 80) return 0.0;

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

// Word stem - first 5 chars (handles Cyrillic morphology: кардиолог / кардиологу / кардиологом)
function stem(w: string): string {
  return w.length > 5 ? w.slice(0, 5) : w;
}

/**
 * Bidirectional token overlap: max(intersect/rawWords, intersect/synWords)
 * This allows short raw names like "кардиолог" to match "Прием кардиолога"
 */
function bidirectionalOverlap(rawWords: string[], synWords: string[]): number {
  if (rawWords.length === 0 || synWords.length === 0) return 0;

  // Use stems for matching to handle Russian morphology
  const rawStems = rawWords.map(stem);
  const synStems = synWords.map(stem);

  const intersectCount = rawStems.filter(rs => synStems.some(ss => ss === rs)).length;

  const rawCoverage = intersectCount / rawWords.length;   // how much of raw is in synonym
  const synCoverage = intersectCount / synWords.length;   // how much of synonym is in raw

  // Take the max - if all raw words are in the synonym, that's a strong match
  return Math.max(rawCoverage, synCoverage);
}

/**
 * standard matchService algorithm: Exact -> Synonym -> Bidirectional Token Overlap -> Fuzzy
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
        nameWeakWords: getWeakWords(cleanedName),
        synonyms: s.synonyms.map(syn => {
          const cleanedSyn = cleanRawName(syn);
          return {
            original: syn,
            cleaned: cleanedSyn,
            words: getWords(cleanedSyn),
            weakWords: getWeakWords(cleanedSyn),
          };
        })
      };
    });
    lastCacheTime = now;
  }

  const services = cachedServices;
  const cleanedRaw = cleanRawName(rawName);

  if (!cleanedRaw || cleanedRaw.length < 2) {
    return { serviceId: null, confidence: 0 };
  }

  const rawWords = getWords(cleanedRaw);
  const rawWeakWords = getWeakWords(cleanedRaw);

  // ── PASS 1: Exact match on cleaned string ──────────────────────────────────
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

  // ── PASS 2: Bidirectional Word Overlap (with stems) ────────────────────────
  let bestServiceId: string | null = null;
  let bestConfidence = 0.0;

  for (const s of services) {
    // Check all synonyms bidirectionally
    for (const syn of s.synonyms) {
      const synWords = syn.words.length > 0 ? syn.words : syn.weakWords;
      if (synWords.length === 0) continue;

      const overlap = bidirectionalOverlap(rawWords.length > 0 ? rawWords : rawWeakWords, synWords);

      if (overlap >= 0.85) {
        // Very strong match - all key words present
        const conf = 0.90 + Math.min(0.09, synWords.length * 0.01);
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestServiceId = s.id;
        }
      } else if (overlap >= 0.60) {
        const conf = overlap * 0.88;
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestServiceId = s.id;
        }
      }
    }

    // Also check main name (not just synonyms)
    const nameWords = s.nameWords.length > 0 ? s.nameWords : s.nameWeakWords;
    if (nameWords.length > 0) {
      const overlap = bidirectionalOverlap(rawWords.length > 0 ? rawWords : rawWeakWords, nameWords);
      if (overlap >= 0.85) {
        const conf = 0.88 + Math.min(0.08, nameWords.length * 0.01);
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestServiceId = s.id;
        }
      } else if (overlap >= 0.60) {
        const conf = overlap * 0.85;
        if (conf > bestConfidence) {
          bestConfidence = conf;
          bestServiceId = s.id;
        }
      }
    }
  }

  // Return immediately on strong overlap match
  if (bestConfidence >= 0.90) {
    return { serviceId: bestServiceId, confidence: Number(bestConfidence.toFixed(2)) };
  }

  // ── PASS 3: Fuzzy Levenshtein (only for short strings or when overlap was promising) ──
  if (bestConfidence < CONFIDENCE_THRESHOLD && cleanedRaw.length <= 60) {
    for (const s of services) {
      // Only attempt fuzzy if there's at least one shared stem
      const rawStems = (rawWords.length > 0 ? rawWords : rawWeakWords).map(stem);
      const hasSharedStem =
        s.nameWeakWords.some(w => rawStems.includes(stem(w))) ||
        s.synonyms.some(syn => syn.weakWords.some(w => rawStems.includes(stem(w))));

      if (!hasSharedStem) continue;

      for (const syn of s.synonyms) {
        const sim = getSimilarity(cleanedRaw, syn.cleaned);
        if (sim > bestConfidence) {
          bestConfidence = sim;
          bestServiceId = s.id;
        }
      }

      const nameSim = getSimilarity(cleanedRaw, s.cleanedName);
      if (nameSim > bestConfidence) {
        bestConfidence = nameSim;
        bestServiceId = s.id;
      }
    }
  }

  const confidence = Number(bestConfidence.toFixed(2));
  if (confidence >= CONFIDENCE_THRESHOLD) {
    return { serviceId: bestServiceId, confidence };
  }

  return { serviceId: null, confidence };
}
