import { ClothingItem, GeneratedOutfit, GenerationStats, OutfitFilters } from "@/types/clothing";

// ============================================================
// COLOR — grouped by family instead of exact string match, since
// Gemini returns descriptive colors ("dark brown", "charcoal grey")
// that an exact-match neutrals list would never recognize.
//
// Extended with a simplified 12-point hue wheel + warm/cool + saturation
// inference from descriptive keywords, so the engine can reason about
// complementary/analogous/triadic relationships and saturation clash
// instead of only "same family vs not". Still entirely derived from the
// existing primary_color/secondary_colors text fields - no new schema,
// no computer vision.
// ============================================================

const COLOR_FAMILY_KEYWORDS: [family: string, keywords: string[]][] = [
  ["neutral", ["black", "white", "grey", "gray", "cream", "beige", "ivory", "charcoal", "off-white"]],
  ["blue", ["navy", "blue", "denim", "indigo"]],
  ["earth", ["brown", "tan", "olive", "khaki", "camel", "rust"]],
  ["green", ["green", "forest", "sage", "emerald"]],
  ["red", ["red", "maroon", "burgundy", "wine"]],
  ["yellow", ["yellow", "mustard", "gold"]],
  ["purple", ["purple", "lavender", "plum"]],
  ["pink", ["pink", "blush"]],
];

// Approximate positions on a 12-point hue wheel, laid out to match real
// complementary pairs (red-green, orange-blue, yellow-purple all land
// exactly 6 apart) rather than an arbitrary even spacing of the 7 family
// buckets - only what's needed to classify analogous (adjacent) / triadic
// (4 apart) / complementary (opposite, 6 apart) relationships.
const FAMILY_HUE: Record<string, number> = { red: 0, earth: 2, yellow: 4, green: 6, blue: 8, purple: 10, pink: 11 };
const WARM_FAMILIES = new Set(["red", "earth", "yellow", "pink"]);
const COOL_FAMILIES = new Set(["green", "blue", "purple"]);

interface ColorInfo {
  family: string;
  hue: number | null; // null = neutral (no hue) or an unmapped family
  warmth: "warm" | "cool" | "neutral";
  saturation: "high" | "medium" | "low";
}

function colorFamily(color: string): string {
  const c = color.toLowerCase().trim();
  for (const [family, keywords] of COLOR_FAMILY_KEYWORDS) {
    if (keywords.some((k) => c.includes(k))) return family;
  }
  return c;
}

function colorInfo(color: string): ColorInfo {
  const c = color.toLowerCase().trim();
  const family = colorFamily(c);

  let saturation: ColorInfo["saturation"] = "medium";
  if (["bright", "neon", "vivid", "vibrant", "electric"].some((w) => c.includes(w))) saturation = "high";
  else if (["pale", "muted", "dusty", "washed", "faded", "soft", "pastel", "light"].some((w) => c.includes(w))) saturation = "low";
  else if (["dark", "deep"].some((w) => c.includes(w)) && family !== "neutral") saturation = "low";

  const warmth: ColorInfo["warmth"] = family === "neutral" ? "neutral" : WARM_FAMILIES.has(family) ? "warm" : COOL_FAMILIES.has(family) ? "cool" : "neutral";
  const hue = family === "neutral" ? null : (FAMILY_HUE[family] ?? null);

  return { family, hue, warmth, saturation };
}

type HueRelationship = "same" | "analogous" | "complementary" | "triadic" | "clash";

function hueRelationship(hueA: number, hueB: number): HueRelationship {
  const diff = Math.min(Math.abs(hueA - hueB), 12 - Math.abs(hueA - hueB));
  if (diff === 0) return "same";
  if (diff <= 2) return "analogous";
  if (diff === 6) return "complementary";
  if (diff === 4) return "triadic";
  return "clash"; // the "awkward middle" hue distances (3 or 5)
}

// Pairwise color score between two ITEMS (not raw strings) so aesthetic
// context and saturation can factor in - "red + green" isn't a fixed
// verdict, it depends on whether it's a muted olive-and-maroon old money
// pairing or two neon pieces in a streetwear fit.
function pairColorScore(a: ClothingItem, b: ClothingItem, aesthetic?: string): number {
  const ia = colorInfo(a.primary_color);
  const ib = colorInfo(b.primary_color);

  if (ia.family === "neutral" && ib.family === "neutral") return 94;
  if (ia.family === "neutral" || ib.family === "neutral") return 90;
  if (ia.family === ib.family) return 86; // monochromatic pairing

  if (ia.hue === null || ib.hue === null) return 78; // unmapped family - stay neutral rather than guess

  const rel = hueRelationship(ia.hue, ib.hue);
  let score = { analogous: 84, complementary: 80, triadic: 74, clash: 62, same: 86 }[rel];

  // Two loud colors clashing reads worse than two quiet ones - saturation
  // matters more than the raw hue distance itself.
  if (ia.saturation === "high" && ib.saturation === "high" && rel !== "complementary") score -= 8;
  if (ia.saturation === "low" && ib.saturation === "low") score += 6;

  const target = aesthetic?.toLowerCase();
  if (target === "streetwear" || target === "gym" || target === "y2k") {
    if (rel === "complementary" || rel === "triadic") score += 8; // bold contrast is the point, not a flaw
  }
  if (target === "old money" || target === "minimal" || target === "smart casual") {
    if (rel === "clash") score -= 6;
  }
  if (target === "monochrome") {
    score = ia.family === ib.family ? 96 : Math.max(score - 15, 40);
  }

  return Math.max(35, Math.min(96, score));
}

function averageColorHarmony(items: ClothingItem[], aesthetic?: string): number {
  if (items.length < 2) return 85;

  let total = 0;
  let pairs = 0;
  for (let i = 0; i < items.length - 1; i++) {
    total += pairColorScore(items[i], items[i + 1], aesthetic);
    pairs++;
  }
  let score = total / pairs;

  // Color echoing: a secondary color on one piece matching another
  // piece's primary family is a real styling technique (e.g. a jacket's
  // burgundy lining echoing burgundy shoes) - small bonus, not required.
  const primaryFamilies = new Set(items.map((i) => colorFamily(i.primary_color)));
  const hasEcho = items.some((i) => (i.secondary_colors ?? []).some((sc) => primaryFamilies.has(colorFamily(sc))));
  if (hasEcho) score += 3;

  // Color-count discipline: aesthetics that favor restraint are penalized
  // for spreading across many distinct non-neutral families; contrast-
  // forward aesthetics are not.
  const target = aesthetic?.toLowerCase();
  const distinctNonNeutral = new Set(items.map((i) => colorFamily(i.primary_color)).filter((f) => f !== "neutral")).size;
  if ((target === "minimal" || target === "old money" || target === "monochrome") && distinctNonNeutral > 2) {
    score -= (distinctNonNeutral - 2) * 4;
  }

  return Math.round(Math.max(35, Math.min(96, score)));
}

// Used by the diversity ranking (see selectDiverse) - a rough palette
// "signature" so two outfits with totally different clothing IDs but an
// almost identical color story (e.g. both all-black-and-white) aren't
// treated as maximally different just because the item IDs differ.
function paletteSignature(items: ClothingItem[]): Set<string> {
  return new Set(items.map((i) => colorFamily(i.primary_color)));
}

function paletteSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((f) => b.has(f)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

// ============================================================
// AESTHETIC
// ============================================================

function styleTagOverlap(items: ClothingItem[], aesthetic?: string): number {
  if (!aesthetic) return 70;
  const target = aesthetic.toLowerCase();
  const hits = items.filter((i) => i.style.some((s) => s.toLowerCase() === target)).length;
  return Math.round(40 + (hits / items.length) * 60);
}

function aestheticHeuristicBonus(items: ClothingItem[], aesthetic?: string): number {
  if (!aesthetic) return 0;
  const a = aesthetic.toLowerCase();

  const avgComplexity =
    items.reduce((sum, i) => sum + (i.pattern && i.pattern.toLowerCase() !== "plain" ? 1 : 0) + (i.secondary_colors?.length ?? 0), 0) /
    items.length;
  const avgFormality = items.reduce((sum, i) => sum + i.formality, 0) / items.length;
  const fits = items.map((i) => i.fit?.toLowerCase()).filter(Boolean) as string[];
  const sameColorFamily = new Set(items.map((i) => colorFamily(i.primary_color))).size === 1;

  switch (a) {
    case "minimal":
      return Math.max(0, 15 - avgComplexity * 8);
    case "monochrome":
      return sameColorFamily ? 15 : 0;
    case "old money":
      return (avgFormality >= 5 ? 8 : 0) + (fits.some((f) => f.includes("regular") || f.includes("tailored") || f.includes("slim")) ? 7 : 0);
    case "streetwear":
      return fits.some((f) => f.includes("oversized") || f.includes("relaxed")) ? 12 : 0;
    case "formal":
      return avgFormality >= 6 ? 12 : Math.max(0, avgFormality - 6) * 4;
    case "gym":
    case "athletic": {
      const lowFormality = avgFormality <= 3 ? 12 : Math.max(0, 8 - (avgFormality - 3) * 3);
      const performanceMaterial = items.some((i) =>
        ["polyester", "spandex", "nylon", "mesh", "jersey", "dri-fit", "performance", "cotton"].some((m) => (i.material ?? "").toLowerCase().includes(m))
      );
      return lowFormality + (performanceMaterial ? 8 : 0);
    }
    default:
      return 0;
  }
}

function styleScore(items: ClothingItem[], aesthetic?: string): number {
  return Math.min(100, Math.round(styleTagOverlap(items, aesthetic) + aestheticHeuristicBonus(items, aesthetic)));
}

function formalityFit(items: ClothingItem[]): number {
  const vals = items.map((i) => i.formality);
  const spread = Math.max(...vals) - Math.min(...vals);
  return Math.max(50, 96 - spread * 10);
}

// ============================================================
// OCCASION
// ============================================================

const OCCASION_FORMALITY_RANGE: Record<string, [number, number]> = {
  casual: [1, 5],
  college: [1, 5],
  date: [4, 8],
  work: [5, 9],
  dinner: [5, 9],
};

function occasionFit(items: ClothingItem[], occasion?: string): number {
  if (!occasion) return 75;
  const range = OCCASION_FORMALITY_RANGE[occasion.toLowerCase()] ?? [1, 10];
  const avg = items.reduce((sum, i) => sum + i.formality, 0) / items.length;
  if (avg >= range[0] && avg <= range[1]) return 95;
  const dist = avg < range[0] ? range[0] - avg : avg - range[1];
  return Math.max(40, 95 - dist * 12);
}

// ============================================================
// WEATHER — governs *composition* (which layer options are even
// candidates) AND scores every included item by material/season fit.
// ============================================================

type OuterwearPolicy = "exclude" | "rare" | "considered" | "preferred";

function outerwearPolicyFor(weather?: string): OuterwearPolicy {
  switch (weather?.toLowerCase()) {
    case "hot":
      return "exclude";
    case "warm":
      return "rare";
    case "cool":
      return "considered";
    case "cold":
    case "rainy":
      return "preferred";
    default:
      return "considered";
  }
}

function itemWeatherFit(item: ClothingItem, weather?: string): number {
  const w = weather?.toLowerCase();
  if (!w) return 75;

  const seasons = (item.season ?? []).map((s) => s.toLowerCase());
  const material = (item.material ?? "").toLowerCase();
  const nameBlob = `${item.name} ${item.sub_category ?? ""}`.toLowerCase();
  const isOuter = item.category === "outerwear";

  const lightweight = ["cotton", "linen", "mesh", "jersey"].some((m) => material.includes(m));
  const heavy = ["wool", "fleece", "leather", "shearling", "puffer", "denim"].some((m) => material.includes(m));
  const rainSuited = ["rain", "waterproof", "shell", "boot", "gore-tex"].some((k) => nameBlob.includes(k));

  let score = 70;

  if (w === "hot") {
    if (isOuter) score -= 30;
    if (seasons.includes("summer")) score += 18;
    if (seasons.includes("winter")) score -= 18;
    if (lightweight) score += 12;
    if (heavy) score -= 15;
  } else if (w === "warm") {
    if (seasons.includes("summer") || seasons.includes("spring")) score += 10;
    if (seasons.includes("winter")) score -= 8;
    if (lightweight) score += 6;
  } else if (w === "cool") {
    if (seasons.includes("autumn") || seasons.includes("spring")) score += 10;
    if (heavy) score += 4;
  } else if (w === "cold") {
    if (seasons.includes("winter")) score += 18;
    if (seasons.includes("summer")) score -= 18;
    if (heavy) score += 12;
    if (lightweight) score -= 8;
  } else if (w === "rainy") {
    if (rainSuited) score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

function weatherFitScore(items: ClothingItem[], weather?: string): number {
  if (!weather) return 75;
  return Math.round(items.reduce((sum, i) => sum + itemWeatherFit(i, weather), 0) / items.length);
}

// ============================================================
// NAMING / EXPLANATION
// ============================================================

function describeItem(item: ClothingItem): string {
  const color = item.primary_color?.toLowerCase().trim();
  const name = item.name?.trim();
  if (!name) return "item";
  if (!color || name.toLowerCase().includes(color)) return name.toLowerCase();
  return `${color} ${name}`.toLowerCase();
}

// Named from the actual hue relationship between the two pieces, not a
// generic score bucket - "must reflect actual selected clothing" (phase 10).
function paletteDescription(top: ClothingItem, bottom: ClothingItem): string {
  const it = colorInfo(top.primary_color);
  const ib = colorInfo(bottom.primary_color);

  if (it.family === "neutral" && ib.family === "neutral") return "a clean neutral base";
  if (it.family === ib.family) return "a controlled monochrome base";
  if (it.family === "neutral" || ib.family === "neutral") return "a neutral anchor with a touch of color";

  if (it.hue !== null && ib.hue !== null) {
    const rel = hueRelationship(it.hue, ib.hue);
    if (rel === "complementary") return "bold complementary contrast";
    if (rel === "analogous") return "an easy, analogous color pairing";
    if (rel === "triadic") return "a triadic color pairing";
  }
  return "a bit of deliberate contrast";
}

function explain(o: Omit<GeneratedOutfit, "explanation">, filters: OutfitFilters): string {
  const occasion = (filters.occasion ?? "everyday wear").toLowerCase();
  let sentence = `The ${describeItem(o.top)} pairs with the ${describeItem(o.bottom)} for ${paletteDescription(
    o.top,
    o.bottom
  )}, while the ${describeItem(o.shoes)} keeps it grounded for ${occasion}.`;

  if (o.outerwear) {
    sentence += ` The ${describeItem(o.outerwear)} adds a layer suited to the weather.`;
  }
  if (o.accessory) {
    sentence += ` The ${describeItem(o.accessory)} rounds out the look${
      filters.aesthetic ? ` without pulling away from the ${filters.aesthetic} direction` : ""
    }.`;
  }
  if (o.bag) {
    sentence += ` The ${describeItem(o.bag)} finishes the styling.`;
  }
  return sentence;
}

// ============================================================
// DIVERSITY — a genuine distance metric across every optional slot,
// not just a fixed "3 of 4 slots match" threshold. Two outfits are
// near-duplicates if they overlap heavily across whichever slots are
// actually present, scaled to how many slots exist (a 3-item outfit
// sharing 2 slots is far more redundant than a 6-item outfit sharing 2).
// ============================================================

function slotIds(o: GeneratedOutfit): (string | null)[] {
  return [o.bottom.id, o.shoes.id, o.outerwear?.id ?? null, o.accessory?.id ?? null, o.bag?.id ?? null];
}

function outfitItems(o: GeneratedOutfit): ClothingItem[] {
  return [o.top, o.bottom, o.shoes, o.outerwear, o.accessory, o.bag].filter((i): i is ClothingItem => !!i);
}

// Slot-id overlap alone misses "different clothing IDs, same color story"
// (e.g. two outfits that are both all-black-and-white read as near
// identical even with zero shared item IDs) and undercounts "same locked
// item, totally different color direction" as more similar than it is.
// Blending in palette similarity fixes both without a second ranking system.
function overlapRatio(a: GeneratedOutfit, b: GeneratedOutfit): number {
  const idsA = slotIds(a);
  const idsB = slotIds(b);
  let comparable = 0;
  let same = 0;
  for (let i = 0; i < idsA.length; i++) {
    if (idsA[i] === null && idsB[i] === null) continue; // neither outfit has this slot - not informative
    comparable++;
    if (idsA[i] === idsB[i]) same++;
  }
  const idOverlap = comparable === 0 ? 1 : same / comparable;
  const colorOverlap = paletteSimilarity(paletteSignature(outfitItems(a)), paletteSignature(outfitItems(b)));

  return idOverlap * 0.75 + colorOverlap * 0.25;
}

function selectDiverse(sorted: GeneratedOutfit[], limit: number): GeneratedOutfit[] {
  const chosen: GeneratedOutfit[] = [];
  for (const candidate of sorted) {
    const tooSimilar = chosen.some((c) => overlapRatio(c, candidate) >= 0.75);
    if (tooSimilar) continue;
    chosen.push(candidate);
    if (chosen.length >= limit) break;
  }
  // Backfill if diversity was too strict to reach `limit` and better options exist -
  // a slightly-similar 4th-best outfit beats returning fewer than the wardrobe supports.
  if (chosen.length < limit) {
    for (const candidate of sorted) {
      if (chosen.includes(candidate)) continue;
      chosen.push(candidate);
      if (chosen.length >= limit) break;
    }
  }
  return chosen;
}

// ============================================================
// MAIN PIPELINE
//
// locked item -> candidate cores (top x bottom x shoes) -> for each
// core, enumerate REAL outerwear/accessory/bag options (weather-gated,
// not a single deterministic pick) -> score every composition ->
// rank -> diversity-aware selection -> top N
// ============================================================

// ============================================================
// SINGLE-COMPOSITION SCORER — used by the MODIFY flow to re-score one
// outfit after a slot swap, reusing the exact same scoring functions
// generateOutfits() uses internally. Not a second generation system.
// ============================================================

export function scoreComposition(
  composition: { top: ClothingItem; bottom: ClothingItem; shoes: ClothingItem; outerwear?: ClothingItem; accessory?: ClothingItem; bag?: ClothingItem },
  filters: OutfitFilters
): GeneratedOutfit {
  const { top, bottom, shoes, outerwear, accessory, bag } = composition;
  const core = [top, bottom, shoes, ...(outerwear ? [outerwear] : [])];
  const finalItems = [core, accessory ? [accessory] : [], bag ? [bag] : []].flat();

  const colorScore = averageColorHarmony(finalItems, filters.aesthetic);
  const style = styleScore(finalItems, filters.aesthetic);
  const formality = formalityFit(finalItems);
  const occasion = occasionFit(finalItems, filters.occasion);
  const weather = weatherFitScore(core, filters.weather);

  const overall = Math.round(colorScore * 0.2 + style * 0.25 + formality * 0.12 + occasion * 0.23 + weather * 0.2);

  const base = {
    top, bottom, shoes, outerwear, accessory, bag,
    colorScore, styleScore: style, formalityScore: formality, occasionScore: occasion, weatherScore: weather, overall,
  };

  return { ...base, explanation: explain(base, filters) };
}

export function generateOutfits(
  wardrobe: ClothingItem[],
  filters: OutfitFilters,
  limit = 8
): { outfits: GeneratedOutfit[]; stats: GenerationStats } {
  const lockedItem = filters.lockedItemId ? wardrobe.find((i) => i.id === filters.lockedItemId) : undefined;

  let tops = wardrobe.filter((i) => i.category === "top");
  let bottoms = wardrobe.filter((i) => i.category === "bottom");
  let shoes = wardrobe.filter((i) => i.category === "shoes");
  const outerwearPool = wardrobe.filter((i) => i.category === "outerwear");
  const accessoryPool = wardrobe.filter((i) => i.category === "accessory");
  const bagPool = wardrobe.filter((i) => i.category === "bag");

  let lockedOuterwear: ClothingItem | undefined;
  let lockedAccessory: ClothingItem | undefined;
  let lockedBag: ClothingItem | undefined;

  if (lockedItem) {
    if (lockedItem.category === "top") tops = [lockedItem];
    else if (lockedItem.category === "bottom") bottoms = [lockedItem];
    else if (lockedItem.category === "shoes") shoes = [lockedItem];
    else if (lockedItem.category === "outerwear") lockedOuterwear = lockedItem;
    else if (lockedItem.category === "bag") lockedBag = lockedItem;
    else lockedAccessory = lockedItem;
  }

  const policy = outerwearPolicyFor(filters.weather);

  // Outerwear candidate SET (not a single best pick) - "none" is always an
  // option unless locked, so the engine can genuinely choose to omit it.
  const outerwearOptions: (ClothingItem | undefined)[] = lockedOuterwear
    ? [lockedOuterwear]
    : policy === "exclude"
      ? [undefined]
      : [undefined, ...outerwearPool];

  const accessoryOptions: (ClothingItem | undefined)[] = lockedAccessory ? [lockedAccessory] : [undefined, ...accessoryPool];
  const bagOptions: (ClothingItem | undefined)[] = lockedBag ? [lockedBag] : [undefined, ...bagPool];

  const rawCandidates: GeneratedOutfit[] = [];
  let combinationsEvaluated = 0;
  const MAX_RAW_CANDIDATES = 4000; // defensive cap - personal wardrobes are small, this is headroom not a real limit

  outer: for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        for (const outerwear of outerwearOptions) {
          // Cheap early filter: don't even score a "considered"/"rare" outerwear
          // pairing whose own weather fit is clearly bad - saves work and keeps
          // combinationsEvaluated meaningful rather than padded with junk.
          if (outerwear && policy === "rare") {
            const justified = filters.aesthetic
              ? outerwear.style.some((s) => s.toLowerCase() === filters.aesthetic!.toLowerCase())
              : false;
            if (!justified) continue;
          }

          for (const accessory of accessoryOptions) {
            for (const bag of bagOptions) {
              combinationsEvaluated++;
              if (combinationsEvaluated > MAX_RAW_CANDIDATES) break outer;

              const core = [top, bottom, shoe, ...(outerwear ? [outerwear] : [])];
              const finalItems = [core, accessory ? [accessory] : [], bag ? [bag] : []].flat();

              const colorScore = averageColorHarmony(finalItems, filters.aesthetic);
              const style = styleScore(finalItems, filters.aesthetic);
              const formality = formalityFit(finalItems);
              const occasion = occasionFit(finalItems, filters.occasion);
              const weather = weatherFitScore(core, filters.weather); // accessories/bags are weather-neutral

              const overall = Math.round(
                colorScore * 0.2 + style * 0.25 + formality * 0.12 + occasion * 0.23 + weather * 0.2
              );

              const base = {
                top,
                bottom,
                shoes: shoe,
                outerwear,
                accessory,
                bag,
                colorScore,
                styleScore: style,
                formalityScore: formality,
                occasionScore: occasion,
                weatherScore: weather,
                overall,
              };

              rawCandidates.push({ ...base, explanation: explain(base, filters) });
            }
          }
        }
      }
    }
  }

  rawCandidates.sort((a, b) => b.overall - a.overall);

  // Per-core cap: keep only each (top,bottom,shoes) triple's best few
  // layering/accessory variants before diversity selection, so the final
  // ranking isn't dominated by 20 near-identical variants of one triple.
  const bestPerCore = new Map<string, GeneratedOutfit[]>();
  for (const c of rawCandidates) {
    const key = `${c.top.id}|${c.bottom.id}|${c.shoes.id}`;
    const existing = bestPerCore.get(key) ?? [];
    if (existing.length < 2) {
      existing.push(c);
      bestPerCore.set(key, existing);
    }
  }
  const trimmed = Array.from(bestPerCore.values()).flat();
  trimmed.sort((a, b) => b.overall - a.overall);

  const outfits = selectDiverse(trimmed, limit);

  const stats: GenerationStats = {
    wardrobeCount: wardrobe.length,
    topsAvailable: tops.length,
    bottomsAvailable: bottoms.length,
    shoesAvailable: shoes.length,
    outerwearAvailable: outerwearPool.length,
    accessoryAvailable: accessoryPool.length,
    bagAvailable: bagPool.length,
    combinationsEvaluated,
    rawCandidateCount: rawCandidates.length,
    afterCoreTrimCount: trimmed.length,
    returnedCount: outfits.length,
  };

  return { outfits, stats };
}
