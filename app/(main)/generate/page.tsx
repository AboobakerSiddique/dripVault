"use client";

import { useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { mockWardrobe } from "@/lib/mock-wardrobe";
import { generateOutfits } from "@/lib/compatibility-engine";
import { GeneratedOutfit } from "@/types/clothing";
import Chip from "@/components/Chip";
import ItemThumb from "@/components/ItemThumb";

export default function GeneratePage() {
  const [occasion, setOccasion] = useState("Casual");
  const [aesthetic, setAesthetic] = useState("minimal");
  const [weather, setWeather] = useState("Warm");
  const [results, setResults] = useState<GeneratedOutfit[] | null>(null);

  const run = () => {
    // This calls the same engine that /api/generate-outfits calls server-side.
    // Once wardrobe is real, swap mockWardrobe for a fetch to that route.
    setResults(generateOutfits(mockWardrobe, { occasion, aesthetic, weather }, 3));
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl mb-1">
        GENERATE OUTFITS
      </h1>
      <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
        Tell us what you&apos;re up to
      </p>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Occasion</p>
      <div className="flex flex-wrap mb-4">
        {["Casual", "College", "Date", "Work", "Dinner"].map((o) => (
          <Chip key={o} label={o} active={occasion === o} onClick={() => setOccasion(o)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Aesthetic</p>
      <div className="flex flex-wrap mb-4">
        {["minimal", "streetwear", "smart casual", "old money"].map((a) => (
          <Chip key={a} label={a} active={aesthetic === a} onClick={() => setAesthetic(a)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Weather</p>
      <div className="flex flex-wrap mb-6">
        {["Hot", "Warm", "Cool", "Cold", "Rainy"].map((w) => (
          <Chip key={w} label={w} active={weather === w} onClick={() => setWeather(w)} />
        ))}
      </div>

      <button onClick={run} className="btn-chrome w-full py-3 flex items-center justify-center gap-2 mb-6">
        <Sparkles size={16} /> GENERATE OUTFITS
      </button>

      {results && (
        <div className="flex flex-col gap-4">
          {results.map((r, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4 border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                  OUTFIT #{idx + 1}
                </p>
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-accent-dim)" }}
                >
                  <Star size={12} color="var(--color-accent)" fill="var(--color-accent)" />
                  <span className="text-xs" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                    {r.overall}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                {[r.top, r.bottom, r.shoes, r.accessory].filter(Boolean).map((item) => (
                  <div key={item!.id} className="flex flex-col items-center" style={{ width: 60 }}>
                    <ItemThumb category={item!.category} color={item!.primary_color} size={52} />
                    <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>
                      {item!.name}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>
                {r.explanation}
              </p>

              <div className="flex gap-2">
                <button className="btn-chrome flex-1 py-2 text-xs">SAVE</button>
                <button className="btn-outline flex-1 py-2 text-xs">MODIFY</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
