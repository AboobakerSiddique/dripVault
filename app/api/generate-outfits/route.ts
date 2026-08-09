import { NextRequest, NextResponse } from "next/server";
import { generateOutfits } from "@/lib/compatibility-engine";
import { createClient } from "@/lib/supabase/server";
import { OutfitFilters } from "@/types/clothing";

export async function POST(req: NextRequest) {
  const filters: OutfitFilters = await req.json();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: wardrobe, error } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cheap programmatic filter + score pass over the real wardrobe.
  // Plug an AI re-rank/explain call in here later (brief section 12) once
  // the candidate list is small - never send the whole wardrobe to an AI call.
  const outfits = generateOutfits(wardrobe ?? [], filters, 10);

  return NextResponse.json({ outfits });
}
