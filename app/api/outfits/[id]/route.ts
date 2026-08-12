import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfits:error] ${context}`, detail);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("favorite" in body) updates.favorite = !!body.favorite;
  if ("note" in body) {
    // Trim first so whitespace can't be used to dodge the limit - the
    // database CHECK constraint (0010 migration) is the real backstop,
    // this is just a friendlier error before that round-trip.
    const trimmed = typeof body.note === "string" ? body.note.trim() : null;
    if (trimmed && trimmed.length > 100) {
      return NextResponse.json({ error: "Note must be 100 characters or fewer" }, { status: 400 });
    }
    updates.note = trimmed || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("outfits")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id) // ownership boundary - another user's outfit id here just 404s
    .select()
    .single();

  if (error || !data) {
    logError("update_failed", { userId: user.id, outfitId: id, message: error?.message });
    return NextResponse.json({ error: error?.message ?? "Outfit not found" }, { status: error ? 500 : 404 });
  }

  console.log("[outfits] updated", { userId: user.id, outfitId: id, fields: Object.keys(updates) });
  return NextResponse.json({ outfit: data });
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
