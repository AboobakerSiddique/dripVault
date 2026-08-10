"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Lock, Sparkles, Star, X } from "lucide-react";
import { ClothingItem, GeneratedOutfit } from "@/types/clothing";
import { scoreComposition } from "@/lib/compatibility-engine";
import Chip from "@/components/Chip";
import ClothingThumb from "@/components/ClothingThumb";

const AESTHETICS = [
  "minimal", "streetwear", "smart casual", "old money",
  "vintage", "y2k", "monochrome", "formal", "athletic", "korean",
];

export default function GeneratePage() {
  const [occasion, setOccasion] = useState("Casual");
  const [aesthetic, setAesthetic] = useState("minimal");
  const [weather, setWeather] = useState("Warm");
  const [results, setResults] = useState<GeneratedOutfit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<number, "saving" | "saved" | "error">>({});

  const [mode, setMode] = useState<"free" | "locked">("free");
  const [wardrobe, setWardrobe] = useState<ClothingItem[] | null>(null);
  const [lockedItem, setLockedItem] = useState<ClothingItem | null>(null);
  const wardrobeLoading = wardrobe === null;
  const [modifyingIdx, setModifyingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (wardrobe) return;
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((data) => setWardrobe(data.items ?? []));
  }, [wardrobe]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          aesthetic,
          weather,
          lockedItemId: mode === "locked" ? lockedItem?.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate outfits");
      setResults(data.outfits);
      if (!data.outfits?.length) setError("Not enough wardrobe items yet to build a full outfit — add a few more pieces.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const swapSlot = (idx: number, slot: "top" | "bottom" | "shoes" | "outerwear" | "accessory" | "bag", item: ClothingItem | null) => {
    if (!results) return;
    const current = results[idx];
    const updated = scoreComposition(
      {
        top: current.top,
        bottom: current.bottom,
        shoes: current.shoes,
        outerwear: current.outerwear,
        accessory: current.accessory,
        bag: current.bag,
        [slot]: item ?? undefined,
      },
      { occasion, aesthetic, weather }
    );
    setResults((prev) => prev!.map((r, i) => (i === idx ? updated : r)));
    setSaveStatus((s) => {
      const next = { ...s };
      delete next[idx];
      return next;
    });
  };

  const saveOutfit = async (idx: number, r: GeneratedOutfit) => {
    setSaveStatus((s) => ({ ...s, [idx]: "saving" }));
    const items = [
      { clothingItemId: r.top.id, role: "top" as const },
      { clothingItemId: r.bottom.id, role: "bottom" as const },
      { clothingItemId: r.shoes.id, role: "shoes" as const },
      ...(r.outerwear ? [{ clothingItemId: r.outerwear.id, role: "outerwear" as const }] : []),
      ...(r.accessory ? [{ clothingItemId: r.accessory.id, role: "accessory" as const }] : []),
      ...(r.bag ? [{ clothingItemId: r.bag.id, role: "bag" as const }] : []),
    ];
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, aesthetic, weather, score: r.overall, explanation: r.explanation, items }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus((s) => ({ ...s, [idx]: "saved" }));
    } catch {
      setSaveStatus((s) => ({ ...s, [idx]: "error" }));
    }
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          GENERATE OUTFITS
        </h1>
        <Link href="/outfits" className="text-xs" style={{ color: "var(--color-accent)" }}>
          Saved
        </Link>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>Tell us what you&apos;re up to</p>

      <div className="flex mb-6 rounded-full border p-1" style={{ borderColor: "var(--color-border)" }}>
        {(["free", "locked"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-full text-xs"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.05em",
              background: mode === m ? "var(--color-accent)" : "transparent",
              color: mode === m ? "#08080b" : "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            {m === "free" ? "GENERATE FREELY" : "START WITH AN ITEM"}
          </button>
        ))}
      </div>

      {mode === "locked" && (
        <div className="mb-6">
          {lockedItem ? (
            <div
              className="rounded-2xl p-4 mb-3 flex items-center gap-3 border"
              style={{ background: "var(--color-accent-dim)", borderColor: "var(--color-accent)" }}
            >
              <ClothingThumb
                imageUrl={lockedItem.image_url}
                name={lockedItem.name}
                category={lockedItem.category}
                color={lockedItem.primary_color}
                size={56}
              />
              <div className="flex-1">
                <p className="text-[10px] flex items-center gap-1 mb-0.5" style={{ color: "var(--color-accent)" }}>
                  <Lock size={10} /> SELECTED — LOCKED
                </p>
                <p className="text-sm">{lockedItem.name}</p>
              </div>
              <button onClick={() => setLockedItem(null)}>
                <X size={16} color="var(--color-text-muted)" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                START WITH
              </p>
              {wardrobeLoading && (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading your wardrobe...</p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {wardrobe?.map((item) => (
                  <button key={item.id} onClick={() => setLockedItem(item)} className="flex flex-col items-center">
                    <ClothingThumb
                      imageUrl={item.image_url}
                      name={item.name}
                      category={item.category}
                      color={item.primary_color}
                      fill
                    />
                    <p className="text-[9px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>
                      {item.name}
                    </p>
                  </button>
                ))}
              </div>
              {wardrobe && wardrobe.length === 0 && !wardrobeLoading && (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Add some clothes first to build an outfit around one.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Occasion</p>
      <div className="flex flex-wrap mb-4">
        {["Casual", "College", "Date", "Work", "Dinner"].map((o) => (
          <Chip key={o} label={o} active={occasion === o} onClick={() => setOccasion(o)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Aesthetic</p>
      <div className="flex flex-wrap mb-4">
        {AESTHETICS.map((a) => (
          <Chip key={a} label={a} active={aesthetic === a} onClick={() => setAesthetic(a)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Weather</p>
      <div className="flex flex-wrap mb-6">
        {["Hot", "Warm", "Cool", "Cold", "Rainy"].map((w) => (
          <Chip key={w} label={w} active={weather === w} onClick={() => setWeather(w)} />
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading || (mode === "locked" && !lockedItem)}
        className="btn-chrome w-full py-3 flex items-center justify-center gap-2 mb-6 disabled:opacity-50"
      >
        <Sparkles size={16} /> {loading ? "GENERATING..." : "GENERATE OUTFITS"}
      </button>

      {error && <p className="text-xs mb-4" style={{ color: "#ff6b6b" }}>{error}</p>}

      {results && (
        <div className="flex flex-col gap-4">
          {results.map((r, idx) => (
            <div key={idx} className="rounded-2xl p-4 border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>OUTFIT #{idx + 1}</p>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "var(--color-accent-dim)" }}>
                  <Star size={12} color="var(--color-accent)" fill="var(--color-accent)" />
                  <span className="text-xs" style={{ color: "var(--color-accent)", fontWeight: 600 }}>{r.overall}</span>
                </div>
              </div>
              <div className="flex gap-3 mb-3 flex-wrap">
                {[r.top, r.bottom, r.shoes, r.outerwear, r.accessory, r.bag].filter(Boolean).map((item) => (
                  <div key={item!.id} className="flex flex-col items-center relative" style={{ width: 60 }}>
                    <ClothingThumb
                      imageUrl={item!.image_url}
                      name={item!.name}
                      category={item!.category}
                      color={item!.primary_color}
                      size={56}
                    />
                    {lockedItem && item!.id === lockedItem.id && (
                      <div
                        className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
                        style={{ width: 16, height: 16, background: "var(--color-accent)" }}
                      >
                        <Lock size={9} color="#08080b" />
                      </div>
                    )}
                    <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>{item!.name}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>{r.explanation}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => saveOutfit(idx, r)}
                  disabled={saveStatus[idx] === "saving" || saveStatus[idx] === "saved"}
                  className="btn-chrome flex-1 py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  {saveStatus[idx] === "saved" ? (
                    <>
                      <Check size={13} /> SAVED
                    </>
                  ) : saveStatus[idx] === "saving" ? (
                    "SAVING..."
                  ) : (
                    "SAVE"
                  )}
                </button>
                <button
                  onClick={() => setModifyingIdx(modifyingIdx === idx ? null : idx)}
                  className="btn-outline flex-1 py-2 text-xs"
                >
                  {modifyingIdx === idx ? "DONE" : "MODIFY"}
                </button>
              </div>

              {modifyingIdx === idx && wardrobe && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                  {(["bottom", "shoes", "outerwear", "accessory", "bag"] as const).map((slot) => {
                    const current = r[slot];
                    if (lockedItem && current?.id === lockedItem.id) return null; // locked slot - not editable
                    const alternatives = wardrobe.filter((w) => w.category === slot && w.id !== current?.id);
                    if (alternatives.length === 0 && !current) return null;
                    return (
                      <div key={slot} className="mb-3">
                        <p className="text-[10px] uppercase mb-1.5 flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                          <ChevronDown size={10} /> {slot}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {current && (
                            <button
                              onClick={() => swapSlot(idx, slot, null)}
                              className="text-[9px] px-2 py-1 rounded-full flex-shrink-0"
                              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                            >
                              None
                            </button>
                          )}
                          {alternatives.map((alt) => (
                            <button key={alt.id} onClick={() => swapSlot(idx, slot, alt)} className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
                              <ClothingThumb imageUrl={alt.image_url} name={alt.name} category={alt.category} color={alt.primary_color} size={40} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {saveStatus[idx] === "error" && (
                <p className="text-[10px] mt-2" style={{ color: "#ff6b6b" }}>Couldn&apos;t save - try again.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
