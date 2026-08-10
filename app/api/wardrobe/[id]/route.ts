import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[wardrobe-item] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[wardrobe-item:error] ${context}`, detail);
}

const EDITABLE_FIELDS = [
  "name", "category", "sub_category", "primary_color", "secondary_colors",
  "pattern", "fit", "silhouette", "material", "style", "formality", "season",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  // Whitelist rather than passing the body straight through - callers
  // can't smuggle in user_id, image_url, or id via this endpoint.
  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  log("update_request", { userId: user.id, itemId: id, fields: Object.keys(updates) });

  const { data, error } = await supabase
    .from("clothing_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id) // ownership boundary, redundant with RLS but explicit
    .select()
    .single();

  if (error || !data) {
    logError("update_failed", { userId: user.id, itemId: id, message: error?.message });
    return NextResponse.json({ error: error?.message ?? "Item not found" }, { status: error ? 500 : 404 });
  }

  log("update_success", { userId: user.id, itemId: id });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Ownership check first - also gives us image_url for Storage cleanup.
  const { data: item, error: fetchError } = await supabase
    .from("clothing_items")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // outfit_items.clothing_item_id is ON DELETE CASCADE - deleting this item
  // would silently strip it out of any saved outfit that used it, corrupting
  // that outfit's composition. Block deletion instead and tell the user why,
  // rather than letting saved outfits silently lose pieces.
  const { count, error: refError } = await supabase
    .from("outfit_items")
    .select("id", { count: "exact", head: true })
    .eq("clothing_item_id", id);

  if (refError) {
    logError("reference_check_failed", { userId: user.id, itemId: id, message: refError.message });
    return NextResponse.json({ error: refError.message }, { status: 500 });
  }

  if (count && count > 0) {
    log("delete_blocked_referenced", { userId: user.id, itemId: id, referenceCount: count });
    return NextResponse.json(
      { error: `This item is part of ${count} saved outfit(s). Remove it from those first, or delete the outfit(s).` },
      { status: 409 }
    );
  }

  const { error: deleteError } = await supabase.from("clothing_items").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) {
    logError("delete_failed", { userId: user.id, itemId: id, message: deleteError.message });
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Storage cleanup - path is always {user.id}/{filename}, so this can
  // never touch another user's object even if image_url were malformed.
  if (item.image_url) {
    try {
      const url = new URL(item.image_url);
      const marker = "/clothing-images/";
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        const objectPath = url.pathname.slice(idx + marker.length);
        if (objectPath.startsWith(`${user.id}/`)) {
          const { error: storageError } = await supabase.storage.from("clothing-images").remove([objectPath]);
          if (storageError) {
            logError("storage_cleanup_failed", { userId: user.id, itemId: id, message: storageError.message });
          } else {
            log("storage_cleanup_success", { userId: user.id, itemId: id });
          }
        } else {
          logError("storage_cleanup_skipped_path_mismatch", { userId: user.id, itemId: id });
        }
      }
    } catch (err) {
      logError("storage_cleanup_exception", { userId: user.id, itemId: id, message: String(err) });
    }
  }

  log("delete_success", { userId: user.id, itemId: id });
  return NextResponse.json({ deleted: true });
}
