import { NextRequest, NextResponse } from "next/server";
import { generateOutfits } from "@/lib/compatibility-engine";
import { createClient } from "@/lib/supabase/server";
import { OutfitFilters } from "@/types/clothing";

// Safe logging only: operation name, user id, settings, and counts.
// Never logs tokens, keys, or full row payloads.
function log(context: string, detail: Record<string, unknown>) {
  console.log(`[generate-outfits] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[generate-outfits:error] ${context}`, detail);
}

export async function POST(req: NextRequest) {
  let filters: OutfitFilters;
  try {
    filters = await req.json();
  } catch {
    logError("invalid_json_body", {});
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logError("unauthenticated", {});
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  log("request", {
    userId: user.id,
    lockedItemId: filters.lockedItemId ?? null,
    aesthetic: filters.aesthetic ?? null,
    occasion: filters.occasion ?? null,
    weather: filters.weather ?? null,
  });

  const { data: wardrobe, error } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    logError("wardrobe_query_failed", { userId: user.id, status: error.code, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("wardrobe_loaded", { userId: user.id, wardrobeCount: wardrobe?.length ?? 0 });

  try {
    const { outfits, stats } = generateOutfits(wardrobe ?? [], filters, 8);

    log("generation_complete", { userId: user.id, ...stats });

    return NextResponse.json({ outfits, stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError("generation_failed", { userId: user.id, message });
    return NextResponse.json({ error: "Outfit generation failed" }, { status: 500 });
  }
}
