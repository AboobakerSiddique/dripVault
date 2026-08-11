"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, CheckCircle2 } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import Chip from "@/components/Chip";
import { ClothingItem } from "@/types/clothing";

interface HistoryOutfit {
  id: string;
  occasion: string | null;
  aesthetic: string | null;
  weather: string | null;
  score: number | null;
  created_at: string;
  feedback: string | null;
  wearCount: number;
  lastWorn: string | null;
  outfit_items: { role: string; clothing_items: ClothingItem }[];
}

type Tab = "all" | "worn" | "loved";

export default function HistoryClient({ outfits }: { outfits: HistoryOutfit[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = outfits.filter((o) => {
    if (tab === "worn") return o.wearCount > 0;
    if (tab === "loved") return o.feedback === "love";
    return true;
  });

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl mb-1">
        OUTFIT HISTORY
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>{filtered.length} outfits</p>

      <div className="flex flex-wrap mb-4">
        <Chip label="All" active={tab === "all"} onClick={() => setTab("all")} />
        <Chip label="Worn" active={tab === "worn"} onClick={() => setTab("worn")} />
        <Chip label="Loved" active={tab === "loved"} onClick={() => setTab("loved")} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          {tab === "all" ? "No saved outfits yet." : `No ${tab} outfits yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/outfits/${o.id}`}
              className="rounded-2xl p-4 border block"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>
                  {[o.aesthetic, o.occasion, o.weather].filter(Boolean).join(" · ") || "Outfit"}
                </p>
                <div className="flex items-center gap-2">
                  {o.feedback === "love" && <Heart size={12} color="var(--color-accent)" fill="var(--color-accent)" />}
                  {o.wearCount > 0 && (
                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--color-text-muted)" }}>
                      <CheckCircle2 size={10} /> worn {o.wearCount}×
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {o.outfit_items.slice(0, 5).map((oi) => (
                  <ClothingThumb
                    key={oi.clothing_items.id}
                    imageUrl={oi.clothing_items.image_url}
                    name={oi.clothing_items.name}
                    category={oi.clothing_items.category}
                    color={oi.clothing_items.primary_color}
                    size={44}
                  />
                ))}
              </div>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
                Saved {new Date(o.created_at).toLocaleDateString()}
                {o.lastWorn ? ` · last worn ${new Date(o.lastWorn).toLocaleDateString()}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
