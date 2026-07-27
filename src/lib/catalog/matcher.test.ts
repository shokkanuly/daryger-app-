/**
 * Unit tests for the pure parts of the matching engine.
 *
 * Run with: npm run test:unit
 *
 * matchService itself needs a seeded catalogue and is covered by the Phase 1
 * integration script. Everything here is deterministic and database-free, which
 * is what makes it safe to run on every change — the scoring behaviour that took
 * normalization from 1% to 63% is easy to regress silently otherwise.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cleanRawName,
  getWords,
  getSimilarity,
  stem,
  bidirectionalOverlap,
  CONFIDENCE_THRESHOLD,
} from "./matcher";

describe("cleanRawName", () => {
  test("strips leading list numbers and SKU codes", () => {
    assert.equal(cleanRawName("1.2.3. Общий анализ крови"), "общий анализ крови");
    assert.equal(cleanRawName("A12.03.001 - Глюкоза"), "глюкоза");
  });

  test("strips standalone billing codes", () => {
    assert.equal(cleanRawName("В02 Консультация"), "консультация");
    assert.equal(cleanRawName("ВОЗ Прием врача"), "прием врача");
    assert.equal(cleanRawName("А12 Глюкоза"), "глюкоза");
  });

  test("does not bite into words that merely start like a code", () => {
    // \p{L} lookarounds keep these intact; a naive /воз|во/ would gut them.
    assert.equal(cleanRawName("Вода"), "вода");
    assert.equal(cleanRawName("Возраст"), "возраст");
  });

  test("leaves the preposition 'во' to the stop-word list, not the code strip", () => {
    // Real catalogue entries: "во" here is grammar, not a billing code.
    // Stripping it in cleanRawName mangled the visible name; STOP_WORDS drops
    // it at tokenization instead, where it belongs.
    assert.equal(
      cleanRawName("Введение тампона во влагалище"),
      "введение тампона во влагалище"
    );
    assert.ok(!getWords("введение тампона во влагалище").includes("во"));
  });

  test("normalizes the OCR confusions that produce wrong lab matches", () => {
    // Latin/Cyrillic homoglyphs: OCR reads АЛТ as "ajit"/"ajlt", АСТ as "acm".
    // Left unnormalized these match nothing and land in the review queue.
    assert.equal(cleanRawName("ajit"), "алт");
    assert.equal(cleanRawName("ajlt"), "алт");
    assert.equal(cleanRawName("acm"), "аст");
  });

  test("splits hyphen-joined specialities", () => {
    assert.equal(cleanRawName("аллерголог-иммунолог"), "аллерголог иммунолог");
  });

  test("collapses repeated whitespace", () => {
    assert.equal(cleanRawName("  Общий   анализ  "), "общий анализ");
  });
});

describe("getWords", () => {
  test("drops stop words", () => {
    assert.deepEqual(getWords("анализ в крови и мочи"), ["крови", "мочи"]);
  });

  test("drops weak structural words by default", () => {
    // "исследование" and "определение" carry no identifying signal.
    assert.deepEqual(getWords("исследование глюкозы"), ["глюкозы"]);
  });

  test("keeps weak words when asked", () => {
    assert.deepEqual(getWords("исследование глюкозы", true), ["исследование", "глюкозы"]);
  });

  test("drops single characters", () => {
    assert.deepEqual(getWords("а б глюкоза"), ["глюкоза"]);
  });
});

describe("stem", () => {
  test("collapses Cyrillic morphology to a shared prefix", () => {
    // The whole point: these are one word in three grammatical cases.
    assert.equal(stem("кардиолог"), stem("кардиологу"));
    assert.equal(stem("кардиолог"), stem("кардиологом"));
  });

  test("leaves short words intact", () => {
    assert.equal(stem("оак"), "оак");
    assert.equal(stem("кровь"), "кровь");
  });

  test("does not over-collapse distinct words", () => {
    assert.notEqual(stem("глюкоза"), stem("гемоглобин"));
  });
});

describe("bidirectionalOverlap", () => {
  test("scores a short raw name fully contained in a longer synonym", () => {
    // "кардиолог" vs "Прием кардиолога" — the reason the metric is
    // bidirectional rather than a plain Jaccard.
    const score = bidirectionalOverlap(["кардиолог"], ["прием", "кардиолога"]);
    assert.equal(score, 1);
  });

  test("scores full equality as 1", () => {
    assert.equal(bidirectionalOverlap(["глюкоза"], ["глюкоза"]), 1);
  });

  test("scores disjoint token sets as 0", () => {
    assert.equal(bidirectionalOverlap(["глюкоза"], ["ферритин"]), 0);
  });

  test("returns 0 for an empty side rather than dividing by zero", () => {
    assert.equal(bidirectionalOverlap([], ["глюкоза"]), 0);
    assert.equal(bidirectionalOverlap(["глюкоза"], []), 0);
  });

  test("partial overlap lands strictly between 0 and 1", () => {
    const score = bidirectionalOverlap(["общий", "анализ"], ["общий", "белок", "крови"]);
    assert.ok(score > 0 && score < 1, `expected 0 < ${score} < 1`);
  });
});

describe("getSimilarity", () => {
  test("identical strings score 1", () => {
    assert.equal(getSimilarity("глюкоза", "глюкоза"), 1);
  });

  test("a single-character typo stays high", () => {
    assert.ok(getSimilarity("глюкоза", "глюкозa") > 0.8);
  });

  test("unrelated strings score low", () => {
    assert.ok(getSimilarity("глюкоза", "рентген") < 0.4);
  });

  test("two empty strings score 1, one empty scores 0", () => {
    assert.equal(getSimilarity("", ""), 1);
    assert.equal(getSimilarity("глюкоза", ""), 0);
  });

  test("bails out on long inputs instead of running O(n*m)", () => {
    // The perf guard: over 80 chars it returns 0 rather than building the full
    // Levenshtein matrix. The inputs must differ — the equality short-circuit
    // runs first and would return 1 before the guard is ever reached.
    const a = "а".repeat(90);
    const b = "б".repeat(90);
    assert.equal(getSimilarity(a, b), 0);
  });
});

describe("CONFIDENCE_THRESHOLD", () => {
  test("is a named constant in a sane range", () => {
    assert.ok(CONFIDENCE_THRESHOLD > 0 && CONFIDENCE_THRESHOLD < 1);
    assert.equal(CONFIDENCE_THRESHOLD, 0.7);
  });
});
