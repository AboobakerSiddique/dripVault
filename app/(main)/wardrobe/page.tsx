"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { mockWardrobe } from "@/lib/mock-wardrobe";
import { ClothingCategory } from "@/types/clothing";
import Chip from "@/components/Chip";
import ItemThumb from "@/components/ItemThumb";

const CATS: ("All" | ClothingCategory)[] = ["All", "top", "bottom", "shoes", "accessory"];
const LABELS: Record<string, string> = { All: "All", top: "Tops", bottom: "Bottoms", shoes: "Shoes", accessory: "Accessories" };

export default function WardrobePage() {
  const [filter, setFilter] = useState<"All" | ClothingCategory>("All");
  const filtered = filter === "All" ? mockWardrobe : mockWardrobe.filter((i) => i.category === filter);

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          MY WARDROBE
        </h1>
        <div className="flex gap-3">
          <Search size={18} color="var(--color-text-muted)" />
          <SlidersHorizontal size={18} color="var(--color-text-muted)" />
        </div>
      </div>

      <div className="flex flex-wrap mb-4">
        {CATS.map((c) => (
          <Chip key={c} label={LABELS[c]} active={filter === c} onClick={() => setFilter(c)} />
        ))}
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        {filtered.length} items
      </p>

      <div className="grid grid-cols-3 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-xl p-2.5 border"
            style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
          >
            <ItemThumb category={item.category} color={item.primary_color} size={64} />
            <p className="text-xs mt-2" style={{ fontWeight: 500 }}>
              {item.name}
            </p>
            <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--color-text-muted)" }}>
              {item.style[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
