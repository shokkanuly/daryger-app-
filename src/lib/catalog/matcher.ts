import { db } from "@/lib/db";

export const CONFIDENCE_THRESHOLD = 0.85;

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
 * standard matchService algorithm: Exact -> Synonym -> Fuzzy
 */
export async function matchService(rawName: string): Promise<{ serviceId: string | null; confidence: number }> {
  const services = await db.service.findMany({ where: { isActive: true } });
  const nameLower = rawName.toLowerCase().trim();

  // 1. Exact match
  for (const s of services) {
    if (s.name.toLowerCase().trim() === nameLower) {
      return { serviceId: s.id, confidence: 1.0 };
    }
  }

  // 2. Synonym match
  for (const s of services) {
    for (const syn of s.synonyms) {
      if (syn.toLowerCase().trim() === nameLower) {
        return { serviceId: s.id, confidence: 0.95 };
      }
    }
  }

  // 3. Fuzzy match
  let bestServiceId: string | null = null;
  let bestConfidence = 0.0;

  for (const s of services) {
    const nameSim = getSimilarity(rawName, s.name);
    if (nameSim > bestConfidence) {
      bestConfidence = nameSim;
      bestServiceId = s.id;
    }

    for (const syn of s.synonyms) {
      const synSim = getSimilarity(rawName, syn);
      if (synSim > bestConfidence) {
        bestConfidence = synSim;
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
