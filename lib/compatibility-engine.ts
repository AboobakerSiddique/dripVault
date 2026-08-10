import { ClothingItem, GeneratedOutfit, GenerationStats, OutfitFilters } from "@/types/clothing";

// ============================================================
// COLOR — grouped by family instead of exact string match, since
// Gemini returns descriptive colors ("dark brown", "charcoal grey")
// that an exact-match neutrals list would never recognize.
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

function colorFamily(color: string): string {
  const c = color.toLowerCase().trim();
  for (const [family, keywords] of COLOR_FAMILY_KEYWORDS) {
    if (keywords.some((k) => c.includes(k))) return family;
  }
  return c;
}

function colorHarmony(a: string, b: string): number {
  const fa = colorFamily(a);
  const fb = colorFamily(b);
  if (fa === fb) return fa === "neutral" ? 94 : 84;
  if (fa === "neutral" || fb === "neutral") return 90;
  return 60;
}

function averageColorHarmony(items: ClothingItem[]): number {
  if (items.length < 2) return 85;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < items.length - 1; i++) {
    total += colorHarmony(items[i].primary_color, items[i + 1].primary_color);
    pairs++;
  }
  return Math.round(total / pairs);
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

function paletteDescription(colorScore: number): string {
  if (colorScore >= 90) return "a clean, cohesive palette";
  if (colorScore >= 78) return "a complementary palette with just enough contrast";
  return "a deliberate contrast in tone";
}

function explain(o: Omit<GeneratedOutfit, "explanation">, filters: OutfitFilters): string {
  const occasion = (filters.occasion ?? "everyday wear").toLowerCase();
  let sentence = `The ${describeItem(o.top)} pairs with the ${describeItem(o.bottom)} for ${paletteDescription(
    o.colorScore
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
  if (comparable === 0) return 1;
  return same / comparable;
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

  const colorScore = averageColorHarmony(finalItems);
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

              const colorScore = averageColorHarmony(finalItems);
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
