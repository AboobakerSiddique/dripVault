import Link from "next/link";
import { ChevronRight, LayoutGrid, Lock, Sparkles, Bookmark, CalendarDays, Shirt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
import WeatherCard from "@/components/WeatherCard";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import StatusIndicator from "@/components/hud/StatusIndicator";
import ScoreBar from "@/components/hud/ScoreBar";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7;
  const s = new Date(d);
  s.setDate(d.getDate() - day);
  return s;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const weekStart = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const [{ count: itemCount }, { count: outfitCount }, { data: recentOutfits }, { data: profile }, { data: photoRow }, { data: monthPlans }, { data: weekPlans }] =
    await Promise.all([
      supabase.from("clothing_items").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("outfits").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase
        .from("outfits")
        .select("*, outfit_items(role, clothing_items(*))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("profiles").select("username").eq("id", user!.id).maybeSingle(),
      supabase.from("profile_photos").select("image_url").eq("user_id", user!.id).maybeSingle(),
      supabase.from("outfit_plans").select("planned_date").eq("user_id", user!.id).gte("planned_date", monthStart).lte("planned_date", monthEnd),
      supabase
        .from("outfit_plans")
        .select("planned_date, note, outfits(aesthetic, outfit_items(role, clothing_items(*)))")
        .eq("user_id", user!.id)
        .gte("planned_date", toISODate(weekDays[0]))
        .lte("planned_date", toISODate(weekDays[6])),
    ]);

  const featured = recentOutfits?.[0];
  const breakdown = featured?.score_breakdown as { color: number; weather: number; aesthetic: number; occasion: number; layering: number } | null;

  let photoUrl: string | null = null;
  if (photoRow?.image_url) {
    const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(photoRow.image_url, 3600);
    photoUrl = signed?.signedUrl ?? null;
  }

  const plannedDaySet = new Set((monthPlans ?? []).map((p) => p.planned_date));
  const monthDaysInGrid = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const startPad = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;

  const weekPlansByDate = new Map<string, { note: string | null; outfits: { aesthetic: string | null; outfit_items: { clothing_items: { id: string; name: string; category: string; primary_color: string; image_url: string | null } }[] } }>();
  for (const p of weekPlans ?? []) {
    weekPlansByDate.set(p.planned_date, p as never);
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <StatusIndicator label="SYSTEM ONLINE" />
        <p className="tech-label">{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</p>
      </div>

      {/* Identity panel */}
      <Link href="/profile" className="block mb-4">
        <HUDPanel className="p-4 flex items-center justify-between hud-grid-bg">
          <div>
            <TechLabel>GOOD TO SEE YOU,</TechLabel>
            <p className="text-2xl mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 800, textShadow: "0 0 16px rgba(157,140,255,0.35)" }}>
              {(profile?.username ?? "STYLIST").toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="rounded-md overflow-hidden flex items-center justify-center"
              style={{ width: 52, height: 52, border: "1px solid var(--color-accent)", background: "var(--color-bg-1)" }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Shirt size={20} color="var(--color-text-muted)" />
              )}
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>
        </HUDPanel>
      </Link>

      {/* Weather */}
      <div className="mb-4">
        <WeatherCard />
      </div>

      {/* Generate Outfit */}
      <Link href="/generate" className="btn-chrome w-full py-4 flex items-center justify-center gap-2 mb-4 relative">
        <Sparkles size={17} />
        <span style={{ letterSpacing: "0.1em" }}>GENERATE OUTFIT</span>
        <ChevronRight size={16} style={{ position: "absolute", right: 16 }} />
      </Link>

      {/* Stats */}
      <HUDPanel className="p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <LayoutGrid size={18} color="var(--color-cyan)" />
            <div>
              <p className="tech-label">WARDROBE</p>
              <p className="text-sm mono">{itemCount ?? 0} ITEMS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bookmark size={18} color="var(--color-cyan)" />
            <div>
              <p className="tech-label">SAVED OUTFITS</p>
              <p className="text-sm mono">{outfitCount ?? 0} OUTFITS</p>
            </div>
          </div>
        </div>
      </HUDPanel>

      {/* Quick access */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{ width: 4, height: 4, background: "var(--color-accent)" }} />
        <TechLabel>QUICK ACCESS</TechLabel>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-7">
        {[
          { href: "/wardrobe", icon: LayoutGrid, label: "WARDROBE", sub: "Browse all" },
          { href: "/generate", icon: Lock, label: "START WITH AN ITEM", sub: "Lock & style" },
          { href: "/outfits", icon: Bookmark, label: "SAVED OUTFITS", sub: "View & manage" },
          { href: "/planner", icon: CalendarDays, label: "OUTFIT PLANNER", sub: "Plan your week" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="block">
            <HUDPanel className="p-3.5" brackets={false}>
              <t.icon size={18} color="var(--color-accent)" className="mb-3" />
              <p className="text-xs mb-0.5" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>{t.label}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{t.sub}</p>
                <ChevronRight size={12} color="var(--color-text-muted)" />
              </div>
            </HUDPanel>
          </Link>
        ))}
      </div>

      {/* Most recent look */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ width: 4, height: 4, background: "var(--color-accent)" }} />
          <TechLabel>{featured ? "YOUR MOST RECENT LOOK" : "TODAY'S OUTFIT"}</TechLabel>
        </div>
        {featured && <Link href="/outfits" className="tech-label" style={{ color: "var(--color-accent)" }}>VIEW ALL →</Link>}
      </div>

      {featured ? (
        <HUDPanel className="p-3 mb-7" glow>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <HUDPanel brackets className="p-2 hud-grid-bg" glow>
              <div className="grid grid-cols-2 gap-2">
                {featured.outfit_items?.slice(0, 4).map((oi: { role: string; clothing_items: { id: string; name: string; category: string; primary_color: string; image_url: string | null } }) => (
                  <ClothingThumb
                    key={oi.clothing_items.id}
                    imageUrl={oi.clothing_items.image_url}
                    name={oi.clothing_items.name}
                    category={oi.clothing_items.category as never}
                    color={oi.clothing_items.primary_color}
                    fill
                  />
                ))}
              </div>
            </HUDPanel>

            <div className="flex flex-col justify-between">
              <div>
                <p className="tech-label mb-1">{[featured.aesthetic, featured.occasion, featured.weather].filter(Boolean).join(" · ") || "OUTFIT"}</p>
                {featured.score != null && (
                  <p className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", textShadow: "0 0 16px rgba(157,140,255,0.4)" }}>
                    {featured.score}<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>/100</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Link href={`/outfits/${featured.id}`} className="btn-outline text-center py-1.5 text-[10px]">VIEW OUTFIT</Link>
                <Link href={`/generate`} className="btn-outline text-center py-1.5 text-[10px]">MODIFY</Link>
              </div>
            </div>
          </div>

          {breakdown && (
            <div className="mb-3">
              <ScoreBar label="COLOR" value={breakdown.color} />
              <ScoreBar label="WEATHER" value={breakdown.weather} />
              <ScoreBar label="AESTHETIC" value={breakdown.aesthetic} />
              <ScoreBar label="OCCASION" value={breakdown.occasion} />
              <ScoreBar label="LAYERING" value={breakdown.layering} />
            </div>
          )}

          {featured.explanation && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{featured.explanation}</p>
          )}
        </HUDPanel>
      ) : (
        <HUDPanel className="p-6 text-center mb-7">
          <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>No outfit generated yet today</p>
          <Link href="/generate" className="btn-outline inline-block px-4 py-2 text-xs">STYLE ME</Link>
        </HUDPanel>
      )}

      {/* Calendar preview */}
      <div className="flex items-center justify-between mb-3">
        <TechLabel>OUTFIT CALENDAR</TechLabel>
        <Link href="/planner" className="tech-label" style={{ color: "var(--color-accent)" }}>VIEW →</Link>
      </div>
      <HUDPanel className="p-4 mb-7" brackets={false}>
        <p className="text-xs mb-3">{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: monthDaysInGrid }, (_, i) => {
            const dayNum = i + 1;
            const iso = toISODate(new Date(now.getFullYear(), now.getMonth(), dayNum));
            const isToday = dayNum === now.getDate();
            const hasPlan = plannedDaySet.has(iso);
            return (
              <div
                key={iso}
                className="aspect-square rounded flex items-center justify-center text-[10px] mono relative"
                style={{
                  background: isToday ? "var(--color-accent-dim)" : "transparent",
                  border: isToday ? "1px solid var(--color-accent)" : "1px solid transparent",
                  color: isToday ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              >
                {dayNum}
                {hasPlan && <span style={{ position: "absolute", bottom: 2, width: 3, height: 3, borderRadius: "50%", background: "var(--color-cyan)" }} />}
              </div>
            );
          })}
        </div>
      </HUDPanel>

      {/* Weekly planner preview */}
      <div className="flex items-center justify-between mb-3">
        <TechLabel>WEEKLY PLANNER</TechLabel>
        <Link href="/planner" className="tech-label" style={{ color: "var(--color-accent)" }}>VIEW →</Link>
      </div>
      <div className="flex flex-col gap-2">
        {weekDays.map((d) => {
          const iso = toISODate(d);
          const plan = weekPlansByDate.get(iso);
          return (
            <HUDPanel key={iso} className="p-2.5 flex items-center gap-3" brackets={false}>
              <p className="tech-label" style={{ width: 34, flexShrink: 0 }}>{d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</p>
              {plan ? (
                <>
                  <div className="flex gap-1">
                    {plan.outfits?.outfit_items?.slice(0, 2).map((oi) => (
                      <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category as never} color={oi.clothing_items.primary_color} size={28} />
                    ))}
                  </div>
                  <p className="text-[11px] flex-1 truncate" style={{ color: "var(--color-text-muted)" }}>{plan.note ?? plan.outfits?.aesthetic ?? "Outfit"}</p>
                </>
              ) : (
                <p className="text-[11px] flex-1" style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>No outfit planned</p>
              )}
            </HUDPanel>
          );
        })}
      </div>
    </div>
  );
}