import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[preferences] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[preferences:error] ${context}`, detail);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();
  if (error) {
    logError("fetch_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ?? { preferred_styles: [], preferred_colors: [], preferred_fits: [] },
  });
}

const EDITABLE_FIELDS = ["preferred_styles", "preferred_colors", "preferred_fits", "disliked_styles", "disliked_colors"] as const;

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const updates: Record<string, unknown> = { user_id: user.id };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  log("update", { userId: user.id, fields: Object.keys(updates) });

  const { data, error } = await supabase.from("user_preferences").upsert(updates).select().single();
  if (error) {
    logError("upsert_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}
