import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Used by the "start with an item" picker on /generate - a plain
// authenticated read, scoped by RLS the same way every other query is.
export async function GET() {
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: wardrobe ?? [] });
}
