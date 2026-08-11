import Link from "next/link";
import { LayoutGrid, Shirt, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
import WeatherCard from "@/components/WeatherCard";

// "Your Wardrobe" and "Recently Saved" preview sections were removed per
// request - only the counted stat tiles and the featured/most-recent
// outfit remain. Queries trimmed to match: no more recent-items or
// preview-outfits fetch, just the 2 head-only counts + 1 recent outfit.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: itemCount }, { count: outfitCount }, { data: recentOutfits }, { data: profile }] = await Promise.all([
    supabase.from("clothing_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("outfits").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase
      .from("outfits")
      .select("*, outfit_items(role, clothing_items(*))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("profiles").select("username").eq("id", user!.id).maybeSingle(),
  ]);

  const featured = recentOutfits?.[0];

  return (
    <div className="px-5 pt-8 pb-8 max-w-md mx-auto">
      {/* Greeting */}
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Good to see you{profile?.username ? `, ${profile.username}` : ""}
      </p>
      <h1 className="text-2xl mt-1 mb-6" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
        WHAT&apos;S THE PLAN TODAY?
      </h1>

      {/* Weather */}
      <div className="mb-7">
        <WeatherCard />
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        <Link href="/generate" className="btn-chrome py-3.5 flex items-center justify-center gap-2 text-xs col-span-2">
          <Sparkles size={15} /> GENERATE OUTFIT
        </Link>
        <Link
          href="/wardrobe"
          className="rounded-xl py-3.5 flex flex-col items-center justify-center gap-1.5 border text-xs"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <LayoutGrid size={17} /> WARDROBE ({itemCount ?? 0})
        </Link>
        <Link
          href="/outfits"
          className="rounded-xl py-3.5 flex flex-col items-center justify-center gap-1.5 border text-xs"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Shirt size={17} /> SAVED ({outfitCount ?? 0})
        </Link>
      </div>

      {/* Featured / most recent outfit */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          {featured ? "YOUR MOST RECENT LOOK" : "TODAY'S OUTFIT"}
        </p>
        {featured && (
          <Link href={`/outfits/${featured.id}`} className="text-[10px]" style={{ color: "var(--color-accent)" }}>
            View
          </Link>
        )}
      </div>

      {featured ? (
        <div className="rounded-2xl p-4 border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>
              {[featured.aesthetic, featured.occasion, featured.weather].filter(Boolean).join(" · ") || "Outfit"}
            </p>
            {featured.score != null && (
              <span className="text-xs" style={{ color: "var(--color-accent)", fontWeight: 600 }}>{featured.score}</span>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            {featured.outfit_items?.slice(0, 5).map((oi: { role: string; clothing_items: { id: string; name: string; category: string; primary_color: string; image_url: string | null } }) => (
              <ClothingThumb
                key={oi.clothing_items.id}
                imageUrl={oi.clothing_items.image_url}
                name={oi.clothing_items.name}
                category={oi.clothing_items.category as never}
                color={oi.clothing_items.primary_color}
                size={52}
              />
            ))}
          </div>
          {featured.explanation && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{featured.explanation}</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>No outfit generated yet today</p>
          <Link href="/generate" className="btn-outline inline-block px-4 py-2 text-xs">STYLE ME</Link>
        </div>
      )}
    </div>
  );
}
