// Pure, dependency-free text normalization for catalog matching.
//
// These helpers are intentionally kept separate from `matcher.ts` (which pulls
// in the Prisma `db` client) so they can be unit-tested in isolation.

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
export const STOP_WORDS = new Set([
  "в", "на", "и", "для", "у", "с", "из", "по", "о", "об", "при", "за", "не",
  "или", "но", "да", "же",
]);

// Words that are STRUCTURAL rather than identifying (not as strong as stop words, but should be deprioritized)
export const WEAK_WORDS = new Set([
  "исследование", "определение", "метод", "взятие", "забор", "материала",
  "анализ", "соскоба", "посещение", "видеозвонок", "прием", "консультация",
  "первичная", "повторная", "первичный", "повторный",
]);

export function getWords(text: string, includeWeak = false): string[] {
  return text
    .split(/[^a-zA-Z0-9а-яА-ЯёЁ]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w) && (includeWeak || !WEAK_WORDS.has(w)));
}

export function getWeakWords(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9а-яА-ЯёЁ]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Calculates string similarity using normalized Levenshtein distance
 */
export function getSimilarity(s1: string, s2: string): number {
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

// Minimum shared leading characters two words need before we'll consider them
// the same stem. Mirrors the original 5-char prefix window that lifted the
// normalization rate from 1% to 63% (commit 90fd39d).
export const STEM_LEN = 5;

// Longest inflectional ending a Russian word may carry *past* the shared stem
// for us to still treat two words as the same root. Case/number endings top
// out around three characters (-ами, -ями, -ого, -ому, -ыми, -его).
export const MAX_INFLECTION_TAIL = 3;

/**
 * Coarse morphological stem: the first STEM_LEN characters.
 *
 * Kept as a cheap bucketing key and for backwards compatibility. On its own a
 * fixed prefix over-collapses distinct roots that merely share a prefix
 * (магния / магнитотерапия both -> "магни"), so matching goes through
 * {@link wordsShareStem} rather than raw stem equality.
 */
export function stem(w: string): string {
  return w.length > STEM_LEN ? w.slice(0, STEM_LEN) : w;
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/**
 * Decide whether two words are inflectional variants of the same root.
 *
 * Russian inflection is (almost always) suffixation: a shared stem followed by
 * a short case/number ending. So кардиолог / кардиологу / кардиологом all agree
 * on "кардиолог" and differ only in a <=3-char tail — they match. Two words
 * that share only a leading fragment and then diverge for many characters
 * (магния vs магнитотерапия share "магни" then split into "я" vs "тотерапия")
 * are distinct roots and must NOT match.
 *
 * The rule: require a shared leading stem, and require the part of *each* word
 * beyond that shared stem to be no longer than a plausible inflectional ending.
 * The oversized tail on магнитотерапия (9 chars past "магни") is exactly the
 * "sharp length difference" signal that these are different terms.
 */
export function wordsShareStem(a: string, b: string): boolean {
  if (a === b) return true;

  const shared = commonPrefixLength(a, b);
  const shorter = Math.min(a.length, b.length);

  // Must agree on a real stem. For short words (<= STEM_LEN) the whole shorter
  // word has to be a prefix of the other; longer words must share STEM_LEN.
  if (shared < Math.min(STEM_LEN, shorter)) return false;

  // Neither word may run on far past the shared stem — that would be a second
  // root grafted on, not an inflectional ending.
  const tailA = a.length - shared;
  const tailB = b.length - shared;
  return tailA <= MAX_INFLECTION_TAIL && tailB <= MAX_INFLECTION_TAIL;
}

/**
 * Bidirectional token overlap: max(intersect/rawWords, intersect/synWords)
 * This allows short raw names like "кардиолог" to match "Прием кардиолога"
 */
export function bidirectionalOverlap(rawWords: string[], synWords: string[]): number {
  if (rawWords.length === 0 || synWords.length === 0) return 0;

  // Count raw words that share a stem with some synonym word. Uses the
  // morphology-aware predicate so inflections collapse but distinct roots that
  // merely share a prefix (магния / магнитотерапия) do not.
  const intersectCount = rawWords.filter(rw => synWords.some(sw => wordsShareStem(rw, sw))).length;

  const rawCoverage = intersectCount / rawWords.length;   // how much of raw is in synonym
  const synCoverage = intersectCount / synWords.length;   // how much of synonym is in raw

  // Take the max - if all raw words are in the synonym, that's a strong match
  return Math.max(rawCoverage, synCoverage);
}
