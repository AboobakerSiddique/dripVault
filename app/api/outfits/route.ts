import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[outfits] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfits:error] ${context}`, detail);
}

// GET: list the authenticated user's saved outfits, each with its items'
// clothing_items joined in so the list page can render real images
// without N+1 queries.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("outfits")
    .select("*, outfit_items(role, clothing_items(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logError("list_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("list", { userId: user.id, count: data?.length ?? 0 });
  return NextResponse.json({ outfits: data ?? [] });
}

interface SaveOutfitBody {
  occasion?: string;
  aesthetic?: string;
  weather?: string;
  score?: number;
  scoreBreakdown?: { color: number; weather: number; aesthetic: number; occasion: number; layering: number };
  explanation?: string;
  items: { clothingItemId: string; role: "top" | "bottom" | "shoes" | "outerwear" | "accessory" | "bag" }[];
}

// POST: persist a generated outfit. clothing_items is never duplicated -
// outfit_items only stores (outfit_id, clothing_item_id, role) references,
// per the outfits -> outfit_items -> clothing_items -> image_url shape.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: SaveOutfitBody;
  try {
    body = await req.json();
  } catch {
    logError("invalid_json_body", { userId: user.id });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.items || body.items.length < 2) {
    return NextResponse.json({ error: "An outfit needs at least 2 items" }, { status: 400 });
  }

  log("save_request", {
    userId: user.id,
    itemCount: body.items.length,
    occasion: body.occasion ?? null,
    aesthetic: body.aesthetic ?? null,
    weather: body.weather ?? null,
  });

  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      occasion: body.occasion,
      aesthetic: body.aesthetic,
      weather: body.weather,
      score: body.score,
      score_breakdown: body.scoreBreakdown,
      explanation: body.explanation,
    })
    .select()
    .single();

  if (outfitError || !outfit) {
    logError("outfit_insert_failed", { userId: user.id, message: outfitError?.message });
    return NextResponse.json({ error: outfitError?.message ?? "Could not save outfit" }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("outfit_items").insert(
    body.items.map((i) => ({
      outfit_id: outfit.id,
      clothing_item_id: i.clothingItemId,
      role: i.role,
    }))
  );

  if (itemsError) {
    // Clean up the orphaned outfit row rather than leaving a broken
    // half-saved outfit with no items behind.
    await supabase.from("outfits").delete().eq("id", outfit.id);
    logError("outfit_items_insert_failed", { userId: user.id, outfitId: outfit.id, message: itemsError.message });
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  log("save_complete", { userId: user.id, outfitId: outfit.id, itemCount: body.items.length });
  return NextResponse.json({ outfit });
}
