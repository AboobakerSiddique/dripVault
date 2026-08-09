import { ClothingItem, GeneratedOutfit, OutfitFilters } from "@/types/clothing";

const NEUTRALS = ["black", "white", "grey", "gray", "cream", "beige"];

function colorHarmony(a: string, b: string): number {
  const ca = a.toLowerCase();
  const cb = b.toLowerCase();
  if (ca === cb) return 78;
  if (NEUTRALS.includes(ca) && NEUTRALS.includes(cb)) return 94;
  if (NEUTRALS.includes(ca) || NEUTRALS.includes(cb)) return 88;
  return 62;
}

function styleOverlap(items: ClothingItem[], aesthetic?: string): number {
  if (!aesthetic) return 75;
  const target = aesthetic.toLowerCase();
  const hits = items.filter((i) =>
    i.style.some((s) => s.toLowerCase() === target)
  ).length;
  return Math.round(50 + (hits / items.length) * 50);
}

function formalityFit(items: ClothingItem[]): number {
  const vals = items.map((i) => i.formality);
  const spread = Math.max(...vals) - Math.min(...vals);
  return Math.max(50, 96 - spread * 10);
}

function explain(o: Omit<GeneratedOutfit, "explanation">, filters: OutfitFilters): string {
  const palette = o.colorScore >= 88 ? "a balanced neutral palette" : "a contrast-driven palette";
  const occasion = filters.occasion ?? "everyday wear";
  const weather = filters.weather ?? "current";
  return `The ${o.top.primary_color.toLowerCase()} ${o.top.name.toLowerCase()} pairs with the ${o.bottom.primary_color.toLowerCase()} ${o.bottom.name.toLowerCase()} for ${palette}, and the ${o.shoes.name.toLowerCase()} keeps it grounded for ${occasion.toLowerCase()} in ${weather.toLowerCase()} weather.`;
}

/**
 * Programmatic filter + score pass, matching brief section 44-45:
 * candidate generation -> scoring -> top N, BEFORE any AI ranking call.
 * Keep this cheap; call an AI model only to re-rank/explain the survivors.
 */
export function generateOutfits(
  wardrobe: ClothingItem[],
  filters: OutfitFilters,
  limit = 5
): GeneratedOutfit[] {
  const tops = wardrobe.filter((i) => i.category === "top");
  const bottoms = wardrobe.filter((i) => i.category === "bottom");
  const shoes = wardrobe.filter((i) => i.category === "shoes");
  const accessories = wardrobe.filter((i) =>
    ["accessory", "bag", "outerwear"].includes(i.category)
  );

  const candidates: GeneratedOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        const items = [top, bottom, shoe];
        const colorScore = Math.round(
          (colorHarmony(top.primary_color, bottom.primary_color) +
            colorHarmony(bottom.primary_color, shoe.primary_color)) /
            2
        );
        const styleScore = styleOverlap(items, filters.aesthetic);
        const formalityScore = formalityFit(items);
        const accessory = accessories.find((a) =>
          a.style.some((s) => items.some((it) => it.style.includes(s)))
        ) ?? accessories[0];

        const overall = Math.round(
          colorScore * 0.35 + styleScore * 0.35 + formalityScore * 0.3
        );

        const base = { top, bottom, shoes: shoe, accessory, colorScore, styleScore, formalityScore, overall };
        candidates.push({ ...base, explanation: explain(base, filters) });
      }
    }
  }

  candidates.sort((a, b) => b.overall - a.overall);
  return candidates.slice(0, limit);
}
