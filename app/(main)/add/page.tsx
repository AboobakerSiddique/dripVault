"use client";

import { useState } from "react";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Chip from "@/components/Chip";
import { ClothingCategory } from "@/types/clothing";

const CATS: ClothingCategory[] = ["top", "bottom", "shoes", "accessory", "bag", "outerwear"];
const COLORS = ["black", "white", "cream", "grey", "blue", "brown", "olive"];

export default function AddPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClothingCategory>("top");
  const [color, setColor] = useState("black");

  const save = () => {
    if (!name.trim()) return;
    // TODO Phase 3: POST to /api/analyze-clothing with the uploaded image,
    // then insert the confirmed row into clothing_items via Supabase.
    router.push("/wardrobe");
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/wardrobe")}>
          <ChevronLeft size={20} color="var(--color-text-muted)" />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          ADD CLOTHING
        </h1>
      </div>

      <div
        className="rounded-2xl p-6 mb-5 flex flex-col items-center justify-center border border-dashed"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
      >
        <Plus size={22} color="var(--color-text-muted)" />
        <p className="text-xs mt-2 text-center" style={{ color: "var(--color-text-muted)" }}>
          Upload a photo — wired to AI vision analysis in Phase 3
        </p>
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Name</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Beige relaxed trousers"
        className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Category</p>
      <div className="flex flex-wrap mb-4">
        {CATS.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Color</p>
      <div className="flex gap-2 mb-6">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
            }}
          />
        ))}
      </div>

      <button onClick={save} className="btn-chrome w-full py-3 flex items-center justify-center gap-2">
        <Check size={16} /> SAVE ITEM
      </button>
    </div>
  );
}
