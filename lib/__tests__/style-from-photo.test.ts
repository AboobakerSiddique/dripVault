/**
 * Focused tests for lib/style-from-photo.ts - the new logic this feature
 * actually added (color-overlap re-ranking + weak-match detection).
 * Does NOT test the Gemini call or the API route itself (no live network
 * in this environment) - only the pure ranking logic downstream of it.
 * Run via npm run test:engine (see package.json).
 */
import assert from "node:assert";
import { colorOverlapScore, rankByColorOverlap, isWeakMatch } from "../style-from-photo";
import { GeneratedOutfit } from "../../types/clothing";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function outfit(overrides: Partial<GeneratedOutfit>): GeneratedOutfit {
  return {
    top: { id: "t", name: "top", category: "top", primary_color: "black", style: [], formality: 3 },
    bottom: { id: "b", name: "bottom", category: "bottom", primary_color: "black", style: [], formality: 3 },
    shoes: { id: "s", name: "shoes", category: "shoes", primary_color: "white", style: [], formality: 3 },
    colorScore: 80,
    styleScore: 80,
    formalityScore: 80,
    occasionScore: 80,
    weatherScore: 80,
    overall: 80,
    ...overrides,
  };
}

test("colorOverlapScore counts matching pieces against reference colors", () => {
  const o = outfit({
    top: { id: "t", name: "black tee", category: "top", primary_color: "black", style: [], formality: 3 },
    bottom: { id: "b", name: "olive cargos", category: "bottom", primary_color: "olive", style: [], formality: 3 },
    shoes: { id: "s", name: "white sneakers", category: "shoes", primary_color: "white", style: [], formality: 3 },
  });
  assert.strictEqual(colorOverlapScore(o, ["black", "white"]), 2);
  assert.strictEqual(colorOverlapScore(o, ["black", "olive", "white"]), 3);
  assert.strictEqual(colorOverlapScore(o, ["red", "yellow"]), 0);
});

test("colorOverlapScore matches substrings in either direction (e.g. 'dark brown' vs 'brown')", () => {
  const o = outfit({ top: { id: "t", name: "shirt", category: "top", primary_color: "dark brown", style: [], formality: 3 } });
  assert.strictEqual(colorOverlapScore(o, ["brown"]), 1);
});

test("rankByColorOverlap sorts by overlap first, engine score as tiebreak", () => {
  const lowOverlapHighScore = outfit({ overall: 90, top: { id: "t1", name: "top", category: "top", primary_color: "red", style: [], formality: 3 } });
  const highOverlapLowerScore = outfit({ overall: 70, top: { id: "t2", name: "top", category: "top", primary_color: "black", style: [], formality: 3 } });
  const ranked = rankByColorOverlap([lowOverlapHighScore, highOverlapLowerScore], ["black"]);
  assert.strictEqual(ranked[0].top.id, "t2", "outfit with a matching color should rank above a higher-score but color-mismatched outfit");
});

test("rankByColorOverlap respects the limit", () => {
  const outfits = Array.from({ length: 8 }, (_, i) => outfit({ overall: i }));
  assert.strictEqual(rankByColorOverlap(outfits, [], 3).length, 3);
});

test("isWeakMatch is true for an empty result set", () => {
  assert.strictEqual(isWeakMatch([], ["black"]), true);
});

test("isWeakMatch is true when the best result shares zero colors with the reference", () => {
  const ranked = [
    outfit({
      overall: 85,
      top: { id: "t", name: "top", category: "top", primary_color: "pink", style: [], formality: 3 },
      bottom: { id: "b", name: "bottom", category: "bottom", primary_color: "yellow", style: [], formality: 3 },
      shoes: { id: "s", name: "shoes", category: "shoes", primary_color: "purple", style: [], formality: 3 },
    }),
  ];
  assert.strictEqual(isWeakMatch(ranked, ["black", "white"]), true);
});

test("isWeakMatch is false for a genuinely good, color-matching result", () => {
  const ranked = [outfit({ overall: 85, top: { id: "t", name: "top", category: "top", primary_color: "black", style: [], formality: 3 } })];
  assert.strictEqual(isWeakMatch(ranked, ["black"]), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
