import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[outfit-plans] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfit-plans:error] ${context}`, detail);
}

// PATCH: replace the outfit and/or note on an existing plan entry (used
// by the Weekly Planner's "replace outfit" / "edit note" actions).
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
  if ("outfitId" in body) {
    const { data: outfit } = await supabase.from("outfits").select("id").eq("id", body.outfitId).eq("user_id", user.id).single();
    if (!outfit) return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    updates.outfit_id = body.outfitId;
  }
  if ("note" in body) {
    const trimmed = typeof body.note === "string" ? body.note.trim() : null;
    if (trimmed && trimmed.length > 150) {
      return NextResponse.json({ error: "Note must be 150 characters or fewer" }, { status: 400 });
    }
    updates.note = trimmed || null;
  }

  const { data, error } = await supabase.from("outfit_plans").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (error || !data) {
    logError("update_failed", { userId: user.id, planId: id, message: error?.message });
    return NextResponse.json({ error: error?.message ?? "Plan not found" }, { status: error ? 500 : 404 });
  }

  log("updated", { userId: user.id, planId: id });
  return NextResponse.json({ plan: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("outfit_plans").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    logError("delete_failed", { userId: user.id, planId: id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("removed", { userId: user.id, planId: id });
  return NextResponse.json({ deleted: true });
}
