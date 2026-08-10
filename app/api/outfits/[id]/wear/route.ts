import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfits:wear:error] ${context}`, detail);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: outfit } = await supabase.from("outfits").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!outfit) return NextResponse.json({ error: "Outfit not found" }, { status: 404 });

  const { error } = await supabase.from("wear_history").insert({ user_id: user.id, outfit_id: id });
  if (error) {
    logError("insert_failed", { userId: user.id, outfitId: id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[outfits:wear] recorded", { userId: user.id, outfitId: id });
  return NextResponse.json({ ok: true });
}
