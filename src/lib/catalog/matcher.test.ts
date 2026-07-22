import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bidirectionalOverlap,
  cleanRawName,
  getSimilarity,
  getWords,
  stem,
  wordsShareStem,
} from "./normalize";

// These exercise the pure text-normalization helpers behind `matchService`.
// They deliberately avoid the db-coupled `matcher.ts` entry point so they stay
// fast and hermetic. Run with `npm run test:unit`.

// ── stem() ───────────────────────────────────────────────────────────────────

test("stem truncates long words to the 5-char prefix", () => {
  assert.equal(stem("кардиолог"), "карди");
  assert.equal(stem("магнитотерапия"), "магни");
});

test("stem leaves short words (<= 5 chars) untouched", () => {
  assert.equal(stem("кровь"), "кровь");
  assert.equal(stem("mg"), "mg");
  assert.equal(stem("рак"), "рак");
});

test("stem collapses inflectional variants to the same prefix", () => {
  assert.equal(stem("кардиолог"), stem("кардиологу"));
  assert.equal(stem("кардиологу"), stem("кардиологом"));
});

// ── wordsShareStem(): morphology should still collapse ────────────────────────

test("wordsShareStem collapses кардиолог case endings", () => {
  assert.ok(wordsShareStem("кардиолог", "кардиологу"));
  assert.ok(wordsShareStem("кардиолог", "кардиологом"));
  assert.ok(wordsShareStem("кардиологу", "кардиологом"));
  assert.ok(wordsShareStem("кардиолога", "кардиологу")); // two oblique forms
});

test("wordsShareStem collapses noun -> longer inflection (аллерголог)", () => {
  assert.ok(wordsShareStem("аллерголог", "аллерголога"));
  assert.ok(wordsShareStem("гастроэнтеролог", "гастроэнтеролога"));
});

test("wordsShareStem collapses -ология professional pairs", () => {
  assert.ok(wordsShareStem("офтальмолог", "офтальмология"));
  assert.ok(wordsShareStem("гастроэнтеролог", "гастроэнтерология"));
});

test("wordsShareStem collapses magnesium's own inflections", () => {
  assert.ok(wordsShareStem("магний", "магния"));
  assert.ok(wordsShareStem("магния", "магнием"));
});

test("wordsShareStem is reflexive and symmetric", () => {
  assert.ok(wordsShareStem("магния", "магния"));
  assert.equal(
    wordsShareStem("кардиолог", "кардиологом"),
    wordsShareStem("кардиологом", "кардиолог"),
  );
  assert.equal(
    wordsShareStem("магния", "магнитотерапия"),
    wordsShareStem("магнитотерапия", "магния"),
  );
});

// ── wordsShareStem(): the reported collisions must NOT collapse ───────────────

test("wordsShareStem keeps магния (Mg lab test) apart from магнитотерапия", () => {
  // The original bug: both truncate to "магни" and were treated as equal.
  assert.equal(stem("магния"), stem("магнитотерапия"));
  assert.ok(!wordsShareStem("магния", "магнитотерапия"));
});

test("wordsShareStem keeps магний apart from магнитотерапия", () => {
  assert.ok(!wordsShareStem("магний", "магнитотерапия"));
});

test("wordsShareStem keeps аллерген (substance) apart from аллерголог (doctor)", () => {
  assert.equal(stem("аллерген"), stem("аллерголог"));
  assert.ok(!wordsShareStem("аллерген", "аллерголог"));
});

test("wordsShareStem keeps рентген apart from рентгенография", () => {
  assert.ok(!wordsShareStem("рентген", "рентгенография"));
});

test("wordsShareStem requires a real shared stem for short words", () => {
  assert.ok(!wordsShareStem("рак", "рана")); // share only "ра"
  assert.ok(!wordsShareStem("вич", "вид"));
});

test("wordsShareStem still matches short-word inflection (рак -> рака)", () => {
  assert.ok(wordsShareStem("рак", "рака"));
});

test("wordsShareStem rejects words that share a stem then run on differently", () => {
  // кардиолог (cardiologist) vs кардиограмма (ECG trace): agree on "кардио",
  // then "лог" vs "грамма" — different roots, long divergent tail.
  assert.ok(!wordsShareStem("кардиолог", "кардиограмма"));
});

// ── bidirectionalOverlap() ───────────────────────────────────────────────────

test("bidirectionalOverlap no longer matches магния against магнитотерапия", () => {
  // Pre-fix this returned 1.0 (single-word raw vs single-word synonym).
  assert.equal(bidirectionalOverlap(["магния"], ["магнитотерапия"]), 0);
});

test("bidirectionalOverlap: real Mg lab record does not overlap physio synonym", () => {
  const raw = getWords(cleanRawName("Определение магния (Mg) в сыворотке крови"));
  const physio = getWords(cleanRawName("Сеанс магнитотерапии"));
  assert.equal(bidirectionalOverlap(raw, physio), 0);
});

test("bidirectionalOverlap preserves the кардиолог morphology match", () => {
  assert.equal(bidirectionalOverlap(["кардиолога"], ["кардиолог"]), 1);
  assert.equal(bidirectionalOverlap(["кардиолог"], ["прием", "кардиолога"]), 1);
});

test("bidirectionalOverlap returns 0 for empty inputs", () => {
  assert.equal(bidirectionalOverlap([], ["магния"]), 0);
  assert.equal(bidirectionalOverlap(["магния"], []), 0);
});

test("bidirectionalOverlap is a coverage ratio, not a boolean", () => {
  // One of two raw words matches -> 0.5 raw coverage, 1.0 syn coverage -> max 1.0
  assert.equal(bidirectionalOverlap(["магния", "натрия"], ["магния"]), 1);
  // One of two raw words matches a two-word synonym -> 0.5 both ways
  assert.equal(bidirectionalOverlap(["магния", "калия"], ["магния", "хлорид"]), 0.5);
});

// ── getSimilarity() ──────────────────────────────────────────────────────────

test("getSimilarity is 1.0 for identical strings (case-insensitive)", () => {
  assert.equal(getSimilarity("кардиолог", "кардиолог"), 1);
  assert.equal(getSimilarity("Кардиолог", "кардиолог"), 1);
});

test("getSimilarity is 0.0 when only one string is empty", () => {
  assert.equal(getSimilarity("", "магния"), 0);
  assert.equal(getSimilarity("магния", ""), 0);
});

test("getSimilarity is 1.0 for two empty strings", () => {
  assert.equal(getSimilarity("", ""), 1);
});

test("getSimilarity reflects a single-character edit", () => {
  // "магния" vs "магнии": one substitution over length 6 -> 1 - 1/6
  assert.ok(Math.abs(getSimilarity("магния", "магнии") - (1 - 1 / 6)) < 1e-9);
});

test("getSimilarity is symmetric", () => {
  assert.equal(
    getSimilarity("магния", "магнитотерапия"),
    getSimilarity("магнитотерапия", "магния"),
  );
});

test("getSimilarity is low for the confusable Mg / magnetotherapy pair", () => {
  // They share a prefix but differ a lot in length; Levenshtein stays well
  // below the 0.70 confidence threshold.
  assert.ok(getSimilarity("магния", "магнитотерапия") < 0.7);
});

test("getSimilarity short-circuits very long strings to 0", () => {
  const long = "а".repeat(81);
  assert.equal(getSimilarity(long, long + "б"), 0);
});

// ── cleanRawName() ───────────────────────────────────────────────────────────

test("cleanRawName lowercases, strips codes, and splits hyphens", () => {
  assert.equal(cleanRawName("АЛЛЕРГОЛОГ-ИММУНОЛОГ"), "аллерголог иммунолог");
  assert.equal(cleanRawName("  Кардиолог  "), "кардиолог");
});
