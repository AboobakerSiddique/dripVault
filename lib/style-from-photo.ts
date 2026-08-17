import { GeneratedOutfit } from "@/types/clothing";

// Counts how many pieces in an outfit have a primary_color that overlaps
// (substring match either direction) with the reference photo's extracted
// dominant colors. Pure and side-effect free so it's unit-testable without
// spinning up the API route or a live Gemini call.
export function colorOverlapScore(outfit: GeneratedOutfit, referenceColors: string[]): number {
  const refColors = referenceColors.map((c) => c.toLowerCase());
  const items = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear, outfit.accessory, outfit.bag].filter(
    (i): i is NonNullable<typeof i> => !!i
  );
  return items.filter((i) => refColors.some((rc) => i.primary_color.toLowerCase().includes(rc) || rc.includes(i.primary_color.toLowerCase()))).length;
}

// Re-ranks already-generated outfits (from the existing compatibility
// engine - this never generates candidates itself) by how well their
// colors echo the reference photo, breaking ties by the engine's own
// overall score. Not a second recommendation engine - just a stable sort
// over engine output using one already-public field.
export function rankByColorOverlap(outfits: GeneratedOutfit[], referenceColors: string[], limit = 5): GeneratedOutfit[] {
  return [...outfits].sort((a, b) => colorOverlapScore(b, referenceColors) - colorOverlapScore(a, referenceColors) || b.overall - a.overall).slice(0, limit);
}

// True when the wardrobe genuinely can't reproduce the reference well -
// either nothing scored decently, or the best result shares zero colors
// with the reference. Used to show an honest "closest match" disclaimer
// instead of silently presenting a poor match as a confident result.
export function isWeakMatch(ranked: GeneratedOutfit[], referenceColors: string[]): boolean {
  if (ranked.length === 0) return true;
  const bestOverlap = colorOverlapScore(ranked[0], referenceColors);
  return ranked[0].overall < 55 || bestOverlap === 0;
}
