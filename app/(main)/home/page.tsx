import Link from "next/link";
import { LayoutGrid, Shirt, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
import WeatherCard from "@/components/WeatherCard";

// Dashboard queries are all limited/counted, not full-table fetches -
// recent wardrobe items (6), recent saved outfits (3), and two head-only
// count queries. No N+1s, no full wardrobe load just to render previews.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: itemCount }, { count: outfitCount }, { data: recentItems }, { data: recentOutfits }, { data: profile }] =
    await Promise.all([
      supabase.from("clothing_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("outfits").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase
        .from("clothing_items")
        .select("id, name, category, primary_color, image_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("outfits")
        .select("*, outfit_items(role, clothing_items(*))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("profiles").select("username").eq("id", user!.id).maybeSingle(),
    ]);

  const featured = recentOutfits?.[0];
  const previewOutfits = recentOutfits?.slice(1, 3) ?? [];

  return (
    <div className="px-5 pt-8 pb-6 max-w-md mx-auto">
      {/* Greeting */}
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Good to see you{profile?.username ? `, ${profile.username}` : ""}
      </p>
      <h1 className="text-2xl mt-1 mb-5" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
        WHAT&apos;S THE PLAN TODAY?
      </h1>

      {/* Weather */}
      <div className="mb-5">
        <WeatherCard />
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Link href="/generate" className="btn-chrome py-3 flex items-center justify-center gap-2 text-xs col-span-2">
          <Sparkles size={15} /> GENERATE OUTFIT
        </Link>
        <Link
          href="/wardrobe"
          className="rounded-xl py-3 flex flex-col items-center justify-center gap-1 border text-xs"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <LayoutGrid size={16} /> WARDROBE ({itemCount ?? 0})
        </Link>
        <Link
          href="/outfits"
          className="rounded-xl py-3 flex flex-col items-center justify-center gap-1 border text-xs"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Shirt size={16} /> SAVED ({outfitCount ?? 0})
        </Link>
      </div>

      {/* Featured / most recent outfit */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {featured ? "YOUR MOST RECENT LOOK" : "TODAY'S OUTFIT"}
        </p>
        {featured && (
          <Link href={`/outfits/${featured.id}`} className="text-[10px]" style={{ color: "var(--color-accent)" }}>
            View
          </Link>
        )}
      </div>

      {featured ? (
        <div className="rounded-2xl p-4 mb-6 border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
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
        <div className="rounded-2xl p-6 mb-6 text-center border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>No outfit generated yet today</p>
          <Link href="/generate" className="btn-outline inline-block px-4 py-2 text-xs">STYLE ME</Link>
        </div>
      )}

      {/* Wardrobe preview */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>YOUR WARDROBE</p>
        <Link href="/wardrobe" className="text-[10px]" style={{ color: "var(--color-accent)" }}>View all</Link>
      </div>

      {!recentItems || recentItems.length === 0 ? (
        <div className="rounded-2xl p-6 mb-6 text-center border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>Your wardrobe is empty</p>
          <Link href="/add" className="btn-outline inline-block px-4 py-2 text-xs">ADD YOUR FIRST ITEM</Link>
        </div>
      ) : (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {recentItems.map((item) => (
            <Link key={item.id} href={`/wardrobe/${item.id}`} className="flex-shrink-0">
              <ClothingThumb imageUrl={item.image_url} name={item.name} category={item.category} color={item.primary_color} size={64} />
            </Link>
          ))}
        </div>
      )}

      {/* Saved outfits preview */}
      {previewOutfits.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>RECENTLY SAVED</p>
            <Link href="/outfits" className="text-[10px]" style={{ color: "var(--color-accent)" }}>View all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {previewOutfits.map((o) => (
              <Link
                key={o.id}
                href={`/outfits/${o.id}`}
                className="rounded-xl p-3 border flex-shrink-0"
                style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", width: 160 }}
              >
                <p className="text-[10px] capitalize mb-2" style={{ color: "var(--color-text-muted)" }}>
                  {o.aesthetic ?? "Outfit"}
                </p>
                <div className="flex gap-1">
                  {o.outfit_items?.slice(0, 3).map((oi: { clothing_items: { id: string; name: string; category: string; primary_color: string; image_url: string | null } }) => (
                    <ClothingThumb
                      key={oi.clothing_items.id}
                      imageUrl={oi.clothing_items.image_url}
                      name={oi.clothing_items.name}
                      category={oi.clothing_items.category as never}
                      color={oi.clothing_items.primary_color}
                      size={36}
                    />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
