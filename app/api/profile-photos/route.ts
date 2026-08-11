import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[profile-photos] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[profile-photos:error] ${context}`, detail);
}

// Exactly 0 or 1 photo per user (profile_photos.user_id is now UNIQUE -
// see 0007_single_photo_and_dedup.sql). GET returns that single photo
// (or null), not a list.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase.from("profile_photos").select("*").eq("user_id", user.id).maybeSingle();
  if (error) {
    logError("fetch_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ photo: null });

  const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(data.image_url, 3600);
  log("fetch", { userId: user.id, photoId: data.id });
  return NextResponse.json({ photo: { ...data, signed_url: signed?.signedUrl ?? null } });
}

// Replaces any existing photo rather than adding a second one - deletes
// the old row + Storage object first (if present), then inserts the new row.
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

  const { data: existing } = await supabase.from("profile_photos").select("id, image_url").eq("user_id", user.id).maybeSingle();

  if (existing) {
    await supabase.from("profile_photos").delete().eq("id", existing.id);
    const { error: removeError } = await supabase.storage.from("profile-photos").remove([existing.image_url]);
    if (removeError) logError("old_storage_cleanup_failed", { userId: user.id, message: removeError.message });
    log("replaced_existing", { userId: user.id, oldPhotoId: existing.id });
  }

  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ user_id: user.id, image_url: path, is_active: true })
    .select()
    .single();

  if (error) {
    logError("insert_failed", { userId: user.id, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log("upload_success", { userId: user.id, photoId: data.id });
  return NextResponse.json({ photo: data });
}
