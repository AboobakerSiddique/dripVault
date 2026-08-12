"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import Chip from "@/components/Chip";
import { ClothingCategory, ClothingItem } from "@/types/clothing";

const CATS: { value: ClothingCategory | "all" | "favorites"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "favorites", label: "Favourites" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "shoes", label: "Shoes" },
  { value: "accessory", label: "Accessories" },
  { value: "bag", label: "Bag" },
  { value: "outerwear", label: "Outerwear" },
];

// All wardrobe items are already loaded server-side (personal wardrobes are
// small - dozens of items, not thousands), so filtering/search happen
// entirely client-side rather than adding query params + refetches.
export default function WardrobeClient({ items: initialItems }: { items: ClothingItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<ClothingCategory | "all" | "favorites">("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "all" || (category === "favorites" ? item.favorite : item.category === category);
      const matchesQuery =
        !q || item.name.toLowerCase().includes(q) || item.primary_color.toLowerCase().includes(q) || item.style?.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [items, category, query]);

  // Optimistic toggle, persisted through the existing edit route (favorite
  // is already whitelisted there) - reuses existing infra, no new endpoint.
  const toggleFavorite = async (e: React.MouseEvent, item: ClothingItem) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !item.favorite;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: next } : i)));
    const res = await fetch(`/api/wardrobe/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    if (!res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: !next } : i))); // revert on failure
    }
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          MY WARDROBE
        </h1>
        <button onClick={() => setSearchOpen((s) => !s)}>
          <Search size={18} color={searchOpen ? "var(--color-accent)" : "var(--color-text-muted)"} />
        </button>
      </div>

      {searchOpen && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, color, or style..."
          className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
        />
      )}

      <div className="flex flex-wrap mb-3">
        {CATS.map((c) => (
          <Chip key={c.value} label={c.label} active={category === c.value} onClick={() => setCategory(c.value)} />
        ))}
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        {filtered.length} of {items.length} items
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No clothes added yet</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          No items match {searchOpen && query ? `"${query}"` : "this filter"}.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/wardrobe/${item.id}`}
              className="rounded-xl p-2.5 border block relative"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <button
                onClick={(e) => toggleFavorite(e, item)}
                className="absolute top-1.5 right-1.5 z-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ width: 26, height: 26, background: "rgba(8,8,11,0.65)" }}
              >
                <Heart size={13} color={item.favorite ? "#ff6b6b" : "#fff"} fill={item.favorite ? "#ff6b6b" : "none"} />
              </button>
              <ClothingThumb imageUrl={item.image_url} name={item.name} category={item.category} color={item.primary_color} fill />
              <p className="text-xs mt-2" style={{ fontWeight: 500 }}>{item.name}</p>
              <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--color-text-muted)" }}>
                {item.style?.[0] ?? item.primary_color}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
