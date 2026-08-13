import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import MyPhotos from "@/components/MyPhotos";
import Preferences from "@/components/Preferences";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: itemCount } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { count: outfitCount } = await supabase
    .from("outfits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: profile } = await supabase.from("profiles").select("gender").eq("id", user!.id).maybeSingle();

  // Real aggregation, not fake ML: which aesthetic gets loved/liked most
  // often, computed from outfit_feedback joined against outfits. Only
  // shown when there's actually enough signal (>=2 pieces of feedback).
  const { data: lovedOutfits } = await supabase
    .from("outfit_feedback")
    .select("rating, outfits(aesthetic)")
    .eq("user_id", user!.id)
    .in("rating", ["love", "like"]);

  const aestheticCounts = new Map<string, number>();
  for (const f of lovedOutfits ?? []) {
    const aesthetic = (f.outfits as unknown as { aesthetic: string | null } | null)?.aesthetic;
    if (aesthetic) aestheticCounts.set(aesthetic, (aestheticCounts.get(aesthetic) ?? 0) + 1);
  }
  const favoriteAesthetic =
    aestheticCounts.size > 0 && [...aestheticCounts.values()].reduce((a, b) => a + b, 0) >= 2
      ? [...aestheticCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <TechLabel className="mb-1">[ USER PROFILE ]</TechLabel>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-1">
        MY PROFILE
      </h1>
      <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>{user?.email}</p>
      {profile?.gender && (
        <p className="tech-label mb-5 capitalize">{profile.gender.toUpperCase()}&apos;S WARDROBE</p>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <HUDPanel className="p-4 text-center" brackets={false}>
          <p className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{itemCount ?? 0}</p>
          <p className="tech-label mt-0.5">ITEMS</p>
        </HUDPanel>
        <Link href="/outfits" className="block">
          <HUDPanel className="p-4 text-center" brackets={false}>
            <p className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-accent)" }}>{outfitCount ?? 0}</p>
            <p className="tech-label mt-0.5">SAVED OUTFITS</p>
          </HUDPanel>
        </Link>
      </div>

      <div className="flex gap-4 mb-5">
        <Link href="/history" className="tech-label" style={{ color: "var(--color-accent)" }}>HISTORY →</Link>
        <Link href="/planner" className="tech-label" style={{ color: "var(--color-accent)" }}>PLANNER →</Link>
      </div>

      {favoriteAesthetic && (
        <HUDPanel className="p-3 mb-5" glow>
          <TechLabel>YOUR STYLE</TechLabel>
          <p className="text-sm capitalize mt-1">You tend to love <span style={{ color: "var(--color-accent)" }}>{favoriteAesthetic}</span> outfits</p>
        </HUDPanel>
      )}

      <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
        Rate saved outfits with love/like/dislike to help style suggestions improve over time.
      </p>

      <MyPhotos />
      <Preferences />

      <LogoutButton />
    </div>
  );
}
