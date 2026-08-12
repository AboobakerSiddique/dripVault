import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[outfit-plans] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[outfit-plans:error] ${context}`, detail);
}

// GET /api/outfit-plans?from=YYYY-MM-DD&to=YYYY-MM-DD
// Powers both the monthly Calendar and the Weekly Planner - same table,
// same route, just a different date range from the caller.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("outfit_plans")
    .select("*, outfits(id, aesthetic, occasion, favorite, outfit_items(role, clothing_items(*)))")
    .eq("user_id", user.id)
    .order("planned_date", { ascending: true });

  if (from) query = query.gte("planned_date", from);
  if (to) query = query.lte("planned_date", to);

  const { data, error } = await query;
  if (error) {
    logError("list_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("list", { userId: user.id, from, to, count: data?.length ?? 0 });
  return NextResponse.json({ plans: data ?? [] });
}

// POST: assign a saved outfit to a date. Multiple outfits per date are
// allowed (no uniqueness constraint on date alone) - a gym outfit and a
// dinner outfit can both land on the same day.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { outfitId, plannedDate, note } = body ?? {};
  if (!outfitId || !plannedDate) {
    return NextResponse.json({ error: "outfitId and plannedDate are required" }, { status: 400 });
  }

  const trimmedNote = typeof note === "string" ? note.trim() : null;
  if (trimmedNote && trimmedNote.length > 150) {
    return NextResponse.json({ error: "Note must be 150 characters or fewer" }, { status: 400 });
  }

  // Ownership check on the outfit being assigned - RLS also covers the
  // insert itself, but this gives a clean error instead of an opaque FK/RLS failure.
  const { data: outfit } = await supabase.from("outfits").select("id").eq("id", outfitId).eq("user_id", user.id).single();
  if (!outfit) return NextResponse.json({ error: "Outfit not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("outfit_plans")
    .insert({ user_id: user.id, outfit_id: outfitId, planned_date: plannedDate, note: trimmedNote || null })
    .select()
    .single();

  if (error) {
    logError("insert_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("assigned", { userId: user.id, outfitId, plannedDate });
  return NextResponse.json({ plan: data });
}
