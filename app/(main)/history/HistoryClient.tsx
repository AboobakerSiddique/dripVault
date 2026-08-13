"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, CheckCircle2 } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import Chip from "@/components/Chip";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
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
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <TechLabel className="mb-1">[ CHRONOLOGICAL LOG ]</TechLabel>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-1">
        OUTFIT HISTORY
      </h1>
      <p className="tech-label mb-4">{filtered.length} ENTRIES</p>

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
        <div className="flex flex-col gap-2.5">
          {filtered.map((o, i) => (
            <Link key={o.id} href={`/outfits/${o.id}`} className="block relative">
              {i < filtered.length - 1 && (
                <div className="absolute" style={{ left: 11, top: 44, bottom: -20, width: 1, background: "var(--color-border)", zIndex: 0 }} />
              )}
              <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1" style={{ width: 22, flexShrink: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent)", boxShadow: "0 0 6px var(--color-accent)" }} />
                </div>
                <HUDPanel className="p-3.5 flex-1" brackets={false}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="tech-label">{new Date(o.created_at).toLocaleDateString().toUpperCase()}</p>
                    <div className="flex items-center gap-2">
                      {o.feedback === "love" && <Heart size={11} color="var(--color-accent)" fill="var(--color-accent)" />}
                      {o.wearCount > 0 && (
                        <span className="tech-label flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> WORN {o.wearCount}×
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs capitalize mb-2" style={{ color: "var(--color-text-muted)" }}>
                    {[o.aesthetic, o.occasion, o.weather].filter(Boolean).join(" · ") || "Outfit"}
                  </p>
                  <div className="flex gap-2">
                    {o.outfit_items.slice(0, 5).map((oi) => (
                      <ClothingThumb
                        key={oi.clothing_items.id}
                        imageUrl={oi.clothing_items.image_url}
                        name={oi.clothing_items.name}
                        category={oi.clothing_items.category}
                        color={oi.clothing_items.primary_color}
                        size={40}
                      />
                    ))}
                  </div>
                </HUDPanel>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
