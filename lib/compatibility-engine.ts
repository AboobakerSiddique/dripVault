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

/**
 * Item names are already saved as "{color} {sub_category}" (see /add), so
 * blindly prepending the color again in prose produces "black black tee".
 * This only prepends color when the name doesn't already mention it -
 * doesn't touch the stored name itself, display layer only.
 */
function describeItem(item: ClothingItem): string {
  const color = item.primary_color?.toLowerCase().trim();
  const name = item.name?.trim();
  if (!name) return "item";
  if (!color || name.toLowerCase().includes(color)) return name.toLowerCase();
  return `${color} ${name}`.toLowerCase();
}

function explain(o: Omit<GeneratedOutfit, "explanation">, filters: OutfitFilters): string {
  const topDesc = describeItem(o.top);
  const bottomDesc = describeItem(o.bottom);
  const shoesDesc = describeItem(o.shoes);
  const occasion = (filters.occasion ?? "everyday wear").toLowerCase();

  const palette =
    o.colorScore >= 88
      ? "a clean, cohesive palette"
      : "just enough contrast to stay interesting";

  return `The ${topDesc} pairs with the ${bottomDesc} for ${palette}, while the ${shoesDesc} keeps it grounded for ${occasion}.`;
}

/**
 * Programmatic filter + score pass, matching brief section 44-45:
 * candidate generation -> scoring -> top N, BEFORE any AI ranking call.
 * Keep this cheap; call an AI model only to re-rank/explain the survivors.
 *
 * If filters.lockedItemId is set, that item is pinned into its category
 * slot (never swapped out) and the rest of the outfit is built around it.
 */
export function generateOutfits(
  wardrobe: ClothingItem[],
  filters: OutfitFilters,
  limit = 5
): GeneratedOutfit[] {
  const lockedItem = filters.lockedItemId
    ? wardrobe.find((i) => i.id === filters.lockedItemId)
    : undefined;

  let tops = wardrobe.filter((i) => i.category === "top");
  let bottoms = wardrobe.filter((i) => i.category === "bottom");
  let shoes = wardrobe.filter((i) => i.category === "shoes");
  const accessories = wardrobe.filter((i) =>
    ["accessory", "bag", "outerwear"].includes(i.category)
  );
  let forcedAccessory: ClothingItem | undefined;

  if (lockedItem) {
    if (lockedItem.category === "top") tops = [lockedItem];
    else if (lockedItem.category === "bottom") bottoms = [lockedItem];
    else if (lockedItem.category === "shoes") shoes = [lockedItem];
    else forcedAccessory = lockedItem; // accessory / bag / outerwear
  }

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
        const accessory =
          forcedAccessory ??
          accessories.find((a) => a.style.some((s) => items.some((it) => it.style.includes(s)))) ??
          accessories[0];

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
