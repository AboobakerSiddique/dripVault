import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfits:error] ${context}`, detail);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS also enforces this, but scoping the query explicitly avoids
  // even attempting a cross-user read and gives a clean 404 either way.
  const { data, error } = await supabase
    .from("outfits")
    .select("*, outfit_items(role, clothing_items(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
  }
  return NextResponse.json({ outfit: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    logError("delete_failed", { userId: user.id, outfitId: id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
