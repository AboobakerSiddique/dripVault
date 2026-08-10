import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[profile-photos] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[profile-photos:error] ${context}`, detail);
}

// profile-photos is a PRIVATE bucket (unlike clothing-images), so
// image_url in the row is actually just the storage object path -
// we sign a short-lived URL here at read time rather than storing one.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logError("list_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withUrls = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(row.image_url, 3600);
      return { ...row, signed_url: signed?.signedUrl ?? null };
    })
  );

  log("list", { userId: user.id, count: withUrls.length });
  return NextResponse.json({ photos: withUrls });
}

// Client uploads the file to Storage directly (same pattern as clothing
// images), then calls this to persist the row. Path is validated to
// belong to the caller before being trusted.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const path = body?.path;
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) {
    logError("invalid_path", { userId: user.id, path });
    return NextResponse.json({ error: "Invalid photo path" }, { status: 400 });
  }

  const { count } = await supabase
    .from("profile_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isFirst = !count || count === 0;

  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ user_id: user.id, image_url: path, is_active: isFirst })
    .select()
    .single();

  if (error) {
    logError("insert_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("upload_success", { userId: user.id, photoId: data.id, setActive: isFirst });
  return NextResponse.json({ photo: data });
}
