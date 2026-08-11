"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import Chip from "@/components/Chip";
import { ClothingItem } from "@/types/clothing";

interface OutfitRow {
  id: string;
  occasion: string | null;
  aesthetic: string | null;
  weather: string | null;
  score: number | null;
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

  const filtered = filter ? outfits.filter((o) => o.aesthetic === filter) : outfits;

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl mb-1">
        SAVED OUTFITS
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        {filtered.length} of {outfits.length}
      </p>

      {categories.length > 1 && (
        <div className="flex flex-wrap mb-4">
          <Chip label="All" active={filter === null} onClick={() => setFilter(null)} />
          {categories.map((c) => (
            <Chip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
          ))}
        </div>
      )}

      {outfits.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>No outfits saved yet</p>
          <Link href="/generate" className="btn-chrome inline-flex items-center gap-2 px-4 py-2 text-xs">
            <Sparkles size={14} /> GENERATE ONE
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/outfits/${o.id}`}
              className="rounded-2xl p-4 border block"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>
                  {[o.aesthetic, o.occasion, o.weather].filter(Boolean).join(" · ") || "Outfit"}
                </p>
                {o.score != null && <span className="text-xs" style={{ color: "var(--color-accent)", fontWeight: 600 }}>{o.score}</span>}
              </div>
              <div className="flex gap-2">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
