"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Heart, Sparkles } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import Chip from "@/components/Chip";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import { ClothingItem } from "@/types/clothing";

interface OutfitRow {
  id: string;
  occasion: string | null;
  aesthetic: string | null;
  weather: string | null;
  score: number | null;
  favorite: boolean;
  note: string | null;
  created_at: string;
  outfit_items: { role: string; clothing_items: ClothingItem }[];
}

export default function OutfitsListClient({ outfits }: { outfits: OutfitRow[] }) {
  const [filter, setFilter] = useState<string | null>(null);

  // Reuses outfits.aesthetic (already stored on save) as the category -
  // no new column, no duplicated data.
  const categories = useMemo(
    () => Array.from(new Set(outfits.map((o) => o.aesthetic).filter((a): a is string => !!a))).sort(),
    [outfits]
  );

  const filtered = filter === "favorites" ? outfits.filter((o) => o.favorite) : filter ? outfits.filter((o) => o.aesthetic === filter) : outfits;

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <TechLabel>[ OUTFIT ARCHIVE ]</TechLabel>
        <Link href="/planner" className="tech-label flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
          <CalendarDays size={12} /> PLANNER
        </Link>
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-1">
        SAVED OUTFITS
      </h1>
      <p className="tech-label mb-4">{filtered.length} / {outfits.length}</p>

      <div className="flex flex-wrap mb-4">
        <Chip label="All" active={filter === null} onClick={() => setFilter(null)} />
        <Chip label="Favourites" active={filter === "favorites"} onClick={() => setFilter("favorites")} />
        {categories.map((c) => (
          <Chip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
        ))}
      </div>

      {outfits.length === 0 ? (
        <HUDPanel className="p-8 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>No outfits saved yet</p>
          <Link href="/generate" className="btn-chrome inline-flex items-center gap-2 px-4 py-2 text-xs">
            <Sparkles size={14} /> GENERATE ONE
          </Link>
        </HUDPanel>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No outfits in this filter yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <Link key={o.id} href={`/outfits/${o.id}`} className="block">
              <HUDPanel className="p-4" brackets={false}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs capitalize flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                    {o.favorite && <Heart size={11} color="var(--color-danger)" fill="var(--color-danger)" />}
                    {[o.aesthetic, o.occasion, o.weather].filter(Boolean).join(" · ") || "Outfit"}
                  </p>
                  {o.score != null && <span className="text-xs mono" style={{ color: "var(--color-accent)", fontWeight: 600 }}>{o.score}</span>}
                </div>
                <div className="flex gap-2 mb-2">
                  {o.outfit_items.slice(0, 5).map((oi) => (
                    <ClothingThumb
                      key={oi.clothing_items.id}
                      imageUrl={oi.clothing_items.image_url}
                      name={oi.clothing_items.name}
                      category={oi.clothing_items.category}
                      color={oi.clothing_items.primary_color}
                      size={48}
                    />
                  ))}
                </div>
                {o.note && <p className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>&quot;{o.note}&quot;</p>}
              </HUDPanel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
