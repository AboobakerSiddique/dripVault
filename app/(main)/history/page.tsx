import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./HistoryClient";

// Outfit history is built entirely from data that's already saved -
// there's no separate "generated" log (unsaved generations were never
// persisted, by design, so they can't be shown here without fabricating
// history). This page overlays outfit_feedback and wear_history onto the
// existing outfits table rather than creating a new table.
export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: outfits }, { data: feedback }, { data: wears }] = await Promise.all([
    supabase
      .from("outfits")
      .select("*, outfit_items(role, clothing_items(*))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("outfit_feedback").select("outfit_id, rating, created_at").eq("user_id", user!.id),
    supabase.from("wear_history").select("outfit_id, worn_at").eq("user_id", user!.id),
  ]);

  const feedbackByOutfit = new Map<string, string>();
  for (const f of feedback ?? []) {
    // last feedback wins if the user rated the same outfit more than once
    feedbackByOutfit.set(f.outfit_id, f.rating);
  }

  const wearsByOutfit = new Map<string, { count: number; lastWorn: string }>();
  for (const w of wears ?? []) {
    const existing = wearsByOutfit.get(w.outfit_id);
    if (!existing || w.worn_at > existing.lastWorn) {
      wearsByOutfit.set(w.outfit_id, { count: (existing?.count ?? 0) + 1, lastWorn: w.worn_at });
    } else {
      wearsByOutfit.set(w.outfit_id, { count: existing.count + 1, lastWorn: existing.lastWorn });
    }
  }

  const enriched = (outfits ?? []).map((o) => ({
    ...o,
    feedback: feedbackByOutfit.get(o.id) ?? null,
    wearCount: wearsByOutfit.get(o.id)?.count ?? 0,
    lastWorn: wearsByOutfit.get(o.id)?.lastWorn ?? null,
  }));

  return <HistoryClient outfits={enriched} />;
}
