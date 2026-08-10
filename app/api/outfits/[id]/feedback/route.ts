import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfits:feedback:error] ${context}`, detail);
}

const VALID_RATINGS = ["love", "like", "dislike", "never"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rating = body?.rating;
  if (!VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: `rating must be one of ${VALID_RATINGS.join(", ")}` }, { status: 400 });
  }

  // Ownership check before writing feedback against someone else's outfit id.
  const { data: outfit } = await supabase.from("outfits").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!outfit) return NextResponse.json({ error: "Outfit not found" }, { status: 404 });

  const { error } = await supabase
    .from("outfit_feedback")
    .insert({ user_id: user.id, outfit_id: id, rating });

  if (error) {
    logError("insert_failed", { userId: user.id, outfitId: id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[outfits:feedback] recorded", { userId: user.id, outfitId: id, rating });
  return NextResponse.json({ ok: true });
}
