import { db } from "@/lib/db";
import {
  bidirectionalOverlap,
  cleanRawName,
  getSimilarity,
  getWeakWords,
  getWords,
  wordsShareStem,
} from "./normalize";

export const CONFIDENCE_THRESHOLD = 0.70;

// Re-exported so existing importers (e.g. scripts) can keep importing from
// "@/lib/catalog/matcher"; the implementation now lives in ./normalize.
export { cleanRawName } from "./normalize";

interface CachedSynonym {
  original: string;
  cleaned: string;
  words: string[];
  weakWords: string[];
}

interface CachedService {
  id: string;
  name: string;
  cleanedName: string;
  nameWords: string[];
  nameWeakWords: string[];
  synonyms: CachedSynonym[];
}

/**
 * standard matchService algorithm: Exact -> Synonym -> Bidirectional Token Overlap -> Fuzzy
 */
let cachedServices: CachedService[] | null = null;
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
  if (!services) return { serviceId: null, confidence: 0 };

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
      const rawKeyWords = rawWords.length > 0 ? rawWords : rawWeakWords;
      const hasSharedStem =
        s.nameWeakWords.some(w => rawKeyWords.some(rw => wordsShareStem(rw, w))) ||
        s.synonyms.some(syn => syn.weakWords.some(w => rawKeyWords.some(rw => wordsShareStem(rw, w))));

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
