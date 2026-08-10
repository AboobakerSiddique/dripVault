import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[profile-photos] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[profile-photos:error] ${context}`, detail);
}

// PATCH: set this photo as the active one - unsets every other photo for
// this user first so exactly one (or zero) is ever active.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: photo } = await supabase.from("profile_photos").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const { error: clearError } = await supabase.from("profile_photos").update({ is_active: false }).eq("user_id", user.id);
  if (clearError) {
    logError("clear_active_failed", { userId: user.id, message: clearError.message });
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  const { error: setError } = await supabase.from("profile_photos").update({ is_active: true }).eq("id", id).eq("user_id", user.id);
  if (setError) {
    logError("set_active_failed", { userId: user.id, photoId: id, message: setError.message });
    return NextResponse.json({ error: setError.message }, { status: 500 });
  }

  log("set_active", { userId: user.id, photoId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: photo } = await supabase.from("profile_photos").select("id, image_url").eq("id", id).eq("user_id", user.id).single();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const { error: deleteError } = await supabase.from("profile_photos").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) {
    logError("delete_failed", { userId: user.id, photoId: id, message: deleteError.message });
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // image_url is a path scoped to {user.id}/... (validated at upload time),
  // so this can never remove another user's Storage object.
  const { error: storageError } = await supabase.storage.from("profile-photos").remove([photo.image_url]);
  if (storageError) {
    logError("storage_cleanup_failed", { userId: user.id, photoId: id, message: storageError.message });
  }

  log("delete_success", { userId: user.id, photoId: id });
  return NextResponse.json({ deleted: true });
}
