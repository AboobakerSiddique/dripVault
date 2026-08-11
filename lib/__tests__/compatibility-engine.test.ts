/**
 * Lightweight assertion-based tests for the outfit generation engine -
 * no framework dependency, just tsx + Node's assert. Run with:
 *   npm run test:engine
 *
 * These are integration-style tests against realistic fixtures, not just
 * type-checks - they catch the exact regressions this file exists to guard
 * against (single-outfit collapse, forced 4-item outfits, weather/aesthetic
 * having no effect, locked item being dropped or swapped).
 */
import assert from "node:assert";
import { generateOutfits, scoreComposition } from "../compatibility-engine";
import { ClothingItem } from "../../types/clothing";

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

// A realistic mid-size wardrobe: enough variety to exercise diversity,
// weather, layering, and aesthetic logic simultaneously.
const wardrobe: ClothingItem[] = [
  { id: "t1", name: "dark brown button-down shirt", category: "top", primary_color: "dark brown", fit: "regular", style: ["minimal", "smart casual"], formality: 5, material: "cotton", season: ["spring", "autumn"] },
  { id: "t2", name: "white linen shirt", category: "top", primary_color: "white", fit: "regular", style: ["minimal", "smart casual"], formality: 4, material: "linen", season: ["summer"] },
  { id: "t3", name: "black wool sweater", category: "top", primary_color: "black", fit: "regular", style: ["minimal", "old money"], formality: 5, material: "wool", season: ["winter"] },
  { id: "t4", name: "olive oversized hoodie", category: "top", primary_color: "olive", fit: "oversized", style: ["streetwear"], formality: 1, material: "cotton" },
  { id: "b1", name: "dark brown trousers", category: "bottom", primary_color: "dark brown", fit: "regular", style: ["minimal", "smart casual"], formality: 5, material: "wool", season: ["autumn", "winter"] },
  { id: "b2", name: "washed black jeans", category: "bottom", primary_color: "black", fit: "regular", style: ["casual", "streetwear"], formality: 3, material: "denim" },
  { id: "b3", name: "linen shorts", category: "bottom", primary_color: "beige", fit: "regular", style: ["minimal", "casual"], formality: 2, material: "linen", season: ["summer"] },
  { id: "b4", name: "cargo pants", category: "bottom", primary_color: "olive", fit: "relaxed", style: ["streetwear", "workwear"], formality: 2, material: "cotton" },
  { id: "s1", name: "charcoal grey sneakers", category: "shoes", primary_color: "charcoal grey", fit: "regular", style: ["minimal", "casual"], formality: 3, material: "canvas" },
  { id: "s2", name: "white leather sneakers", category: "shoes", primary_color: "white", fit: "regular", style: ["minimal", "smart casual"], formality: 4, material: "leather" },
  { id: "s3", name: "brown chelsea boots", category: "shoes", primary_color: "brown", fit: "regular", style: ["old money", "smart casual"], formality: 6, material: "leather" },
  { id: "acc1", name: "silver watch", category: "accessory", primary_color: "silver", fit: "regular", style: ["minimal", "smart casual"], formality: 5 },
  { id: "bag1", name: "black canvas tote", category: "bag", primary_color: "black", fit: "regular", style: ["casual", "streetwear"], formality: 2 },
  { id: "out1", name: "black wool overcoat", category: "outerwear", primary_color: "black", fit: "regular", style: ["old money", "smart casual", "formal"], formality: 7, material: "wool", season: ["winter"] },
  { id: "out2", name: "olive puffer jacket", category: "outerwear", primary_color: "olive", fit: "relaxed", style: ["streetwear"], formality: 2, material: "puffer", season: ["winter"] },
];

test("Generate Freely returns multiple results", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Warm" }, 8);
  assert.ok(outfits.length > 1, `expected >1 outfit, got ${outfits.length}`);
});

test("Start With An Item returns multiple results", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Warm", lockedItemId: "t1" }, 8);
  assert.ok(outfits.length > 1, `expected >1 outfit, got ${outfits.length}`);
});

test("Locked item appears in every single result", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "streetwear", weather: "Cold", lockedItemId: "t1" }, 8);
  for (const o of outfits) {
    const ids = [o.top, o.bottom, o.shoes, o.outerwear, o.accessory, o.bag].filter(Boolean).map((i) => i!.id);
    assert.ok(ids.includes("t1"), `locked item missing from an outfit: ${JSON.stringify(ids)}`);
  }
});

test("Locked item is never swapped for a different top", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Warm", lockedItemId: "t1" }, 8);
  for (const o of outfits) assert.strictEqual(o.top.id, "t1");
});

test("Hot weather never includes outerwear", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Hot" }, 8);
  for (const o of outfits) assert.strictEqual(o.outerwear, undefined, `hot outfit unexpectedly had outerwear: ${o.outerwear?.name}`);
});

test("Cold weather uses available outerwear at least some of the time", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "old money", weather: "Cold" }, 8);
  const anyWithOuterwear = outfits.some((o) => o.outerwear !== undefined);
  assert.ok(anyWithOuterwear, "cold weather never selected the available overcoat/puffer");
});

test("Hot vs Cold produce genuinely different top picks", () => {
  const hot = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Hot" }, 3).outfits;
  const cold = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Cold" }, 3).outfits;
  assert.notStrictEqual(hot[0].top.id, cold[0].top.id, "hot and cold picked the same top-ranked top item");
});

test("Different aesthetics change the top-ranked result", () => {
  const minimal = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Warm" }, 3).outfits;
  const streetwear = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "streetwear", weather: "Warm" }, 3).outfits;
  const same = minimal[0].top.id === streetwear[0].top.id && minimal[0].bottom.id === streetwear[0].bottom.id;
  assert.ok(!same, "minimal and streetwear produced an identical top-ranked outfit");
});

test("No two results are exact duplicates", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Cool" }, 8);
  const signatures = outfits.map((o) => [o.top.id, o.bottom.id, o.shoes.id, o.outerwear?.id, o.accessory?.id, o.bag?.id].join("|"));
  assert.strictEqual(new Set(signatures).size, signatures.length, "duplicate outfit signature found");
});

test("Outfit size is not forced to a fixed count", () => {
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "minimal", weather: "Hot" }, 8);
  const sizes = new Set(outfits.map((o) => [o.top, o.bottom, o.shoes, o.outerwear, o.accessory, o.bag].filter(Boolean).length));
  assert.ok(sizes.size > 1, `expected varying item counts across results, got only sizes: ${[...sizes]}`);
});

test("Never fabricates an item not in the wardrobe", () => {
  const validIds = new Set(wardrobe.map((i) => i.id));
  const { outfits } = generateOutfits(wardrobe, { occasion: "Casual", aesthetic: "streetwear", weather: "Cold" }, 8);
  for (const o of outfits) {
    for (const item of [o.top, o.bottom, o.shoes, o.outerwear, o.accessory, o.bag].filter(Boolean)) {
      assert.ok(validIds.has(item!.id), `outfit contained an item not in the wardrobe: ${item!.name}`);
    }
  }
});

test("Empty wardrobe returns zero outfits, not a crash", () => {
  const { outfits } = generateOutfits([], { occasion: "Casual", aesthetic: "minimal", weather: "Warm" }, 8);
  assert.strictEqual(outfits.length, 0);
});

test("scoreComposition (used by MODIFY) reflects a swapped slot", () => {
  const t1 = wardrobe.find((i) => i.id === "t1")!;
  const b1 = wardrobe.find((i) => i.id === "b1")!;
  const b2 = wardrobe.find((i) => i.id === "b2")!;
  const s1 = wardrobe.find((i) => i.id === "s1")!;

  const withB1 = scoreComposition({ top: t1, bottom: b1, shoes: s1 }, { occasion: "Casual", aesthetic: "minimal", weather: "Warm" });
  const withB2 = scoreComposition({ top: t1, bottom: b2, shoes: s1 }, { occasion: "Casual", aesthetic: "minimal", weather: "Warm" });

  assert.strictEqual(withB1.bottom.id, "b1");
  assert.strictEqual(withB2.bottom.id, "b2");
  // Rounding can occasionally tie the integer `overall` even when the
  // underlying composition genuinely differs - assert on the sub-scores,
  // which is the real invariant (swapping the bottom must change *something*).
  const changed =
    withB1.colorScore !== withB2.colorScore ||
    withB1.styleScore !== withB2.styleScore ||
    withB1.weatherScore !== withB2.weatherScore;
  assert.ok(changed, "swapping the bottom changed nothing in any sub-score");
});

test("scoreComposition never invents items - output mirrors input exactly", () => {
  const t1 = wardrobe.find((i) => i.id === "t1")!;
  const b1 = wardrobe.find((i) => i.id === "b1")!;
  const s1 = wardrobe.find((i) => i.id === "s1")!;
  const out1 = wardrobe.find((i) => i.id === "out1")!;

  const result = scoreComposition({ top: t1, bottom: b1, shoes: s1, outerwear: out1 }, { occasion: "Casual", aesthetic: "old money", weather: "Cold" });
  assert.strictEqual(result.top.id, "t1");
  assert.strictEqual(result.outerwear?.id, "out1");
  assert.strictEqual(result.accessory, undefined);
});

test("Gym aesthetic favors low-formality athletic pieces over old money pieces", () => {
  const gymTop: ClothingItem = { id: "gym-t1", name: "grey performance tee", category: "top", primary_color: "grey", fit: "regular", style: ["athletic"], formality: 1, material: "polyester" };
  const gymBottom: ClothingItem = { id: "gym-b1", name: "black joggers", category: "bottom", primary_color: "black", fit: "relaxed", style: ["athletic"], formality: 1, material: "polyester" };
  const dressShirt: ClothingItem = { id: "gym-t2", name: "white dress shirt", category: "top", primary_color: "white", fit: "slim", style: ["old money", "formal"], formality: 8, material: "cotton" };
  const dressPants: ClothingItem = { id: "gym-b2", name: "navy dress trousers", category: "bottom", primary_color: "navy", fit: "regular", style: ["old money", "formal"], formality: 8, material: "wool" };
  const shoes: ClothingItem = { id: "gym-s1", name: "white sneakers", category: "shoes", primary_color: "white", fit: "regular", style: ["athletic", "casual"], formality: 2, material: "canvas" };

  const athleticFit = scoreComposition({ top: gymTop, bottom: gymBottom, shoes }, { aesthetic: "gym" });
  const formalFit = scoreComposition({ top: dressShirt, bottom: dressPants, shoes }, { aesthetic: "gym" });

  assert.ok(athleticFit.styleScore > formalFit.styleScore, `gym aesthetic should score athletic wear higher (${athleticFit.styleScore} vs ${formalFit.styleScore})`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
