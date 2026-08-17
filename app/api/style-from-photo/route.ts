import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini-client";
import { generateOutfits } from "@/lib/compatibility-engine";
import { rankByColorOverlap, isWeakMatch } from "@/lib/style-from-photo";

// Same closed vocabulary the rest of the app already uses for aesthetic/
// occasion, so the extracted style profile plugs straight into the
// existing generateOutfits() filters with zero fuzzy-matching logic and
// zero changes to the compatibility engine itself.
const AESTHETICS = ["minimal", "streetwear", "smart casual", "old money", "vintage", "y2k", "monochrome", "formal", "athletic", "korean", "gym"];
const OCCASIONS = ["Casual", "College", "Date", "Work", "Dinner"];

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB - consistent order of magnitude with a phone photo

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    aesthetic: { type: "string", enum: AESTHETICS },
    occasion: { type: "string", enum: OCCASIONS },
    formality: { type: "integer" },
    primary_colors: { type: "array", items: { type: "string" } },
    layered: { type: "boolean" },
    silhouette: { type: "string" },
  },
  required: ["aesthetic", "occasion", "formality", "primary_colors"],
};

const PROMPT = `You are a fashion stylist analyzing a reference outfit photo to extract a compact STYLE PROFILE. Focus entirely on the clothing, colors, silhouette, and overall styling direction - do NOT describe, identify, or comment on any person's identity, face, or appearance, only their clothing. Pick the single closest aesthetic and occasion from the fixed lists provided in the schema (pick your best approximation even if imperfect). primary_colors should be the 2-4 most visually dominant clothing colors in the reference (e.g. "black", "olive green", "cream"). formality is 1-10 (1 = loungewear, 10 = black tie). layered indicates whether the reference outfit uses visible layering (e.g. jacket over shirt). silhouette is a short phrase like "relaxed oversized" or "slim tailored".`;

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[style-from-photo] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[style-from-photo:error] ${context}`, detail);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logError("unauthenticated_request", {});
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No reference image provided" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
  }

  const client = createGeminiClient();
  if ("error" in client) {
    logError("missing_api_key", {});
    return NextResponse.json({ error: client.error }, { status: 500 });
  }

  log("request", { userId: user.id, mimeType: file.type, sizeBytes: file.size });

  const mimeType = file.type;
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  // The reference image is never written to Storage or the database -
  // it exists only in memory for this request, matching "treat as
  // temporary input" - nothing about this feature genuinely needs persistence.

  let styleProfile: { aesthetic: string; occasion: string; formality: number; primary_colors: string[]; layered?: boolean; silhouette?: string };
  try {
    const response = await client.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64 } }] }],
      config: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    });

    const text = response.text;
    if (!text) {
      logError("empty_response", { model: GEMINI_MODEL });
      return NextResponse.json({ error: "Reference photo analysis returned no content" }, { status: 502 });
    }
    styleProfile = JSON.parse(text);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    logError("gemini_call_failed", { model: GEMINI_MODEL, status, message });
    return NextResponse.json({ error: "Reference photo analysis failed" }, { status: 502 });
  }

  log("style_profile_extracted", {
    userId: user.id,
    aesthetic: styleProfile.aesthetic,
    occasion: styleProfile.occasion,
    formality: styleProfile.formality,
    colorCount: styleProfile.primary_colors?.length ?? 0,
  });

  const { data: wardrobe, error: wardrobeError } = await supabase.from("clothing_items").select("*").eq("user_id", user.id);
  if (wardrobeError) {
    logError("wardrobe_query_failed", { userId: user.id, message: wardrobeError.message });
    return NextResponse.json({ error: wardrobeError.message }, { status: 500 });
  }

  // Reuses the EXACT existing engine (no second recommendation system) -
  // the style profile is just mapped onto the same OutfitFilters shape
  // /generate already uses.
  const { outfits, stats } = generateOutfits(wardrobe ?? [], { aesthetic: styleProfile.aesthetic, occasion: styleProfile.occasion }, 8);

  // Light re-rank by color overlap with the reference's dominant colors -
  // extracted to lib/style-from-photo.ts so it's unit-testable; uses only
  // the already-public primary_color field, no engine internals touched.
  const refColors = styleProfile.primary_colors ?? [];
  const ranked = rankByColorOverlap(outfits, refColors, 5);
  const weakMatch = isWeakMatch(ranked, refColors);

  log("generation_complete", { userId: user.id, ...stats, returnedCount: ranked.length, weakMatch });

  return NextResponse.json({
    outfits: ranked,
    styleProfile,
    note: weakMatch
      ? "Your wardrobe doesn't have a strong match for this reference - here's the closest option available."
      : null,
  });
}
