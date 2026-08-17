"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ImageUp, Lock, Sparkles, X } from "lucide-react";
import { ClothingItem, GeneratedOutfit } from "@/types/clothing";
import { scoreComposition } from "@/lib/compatibility-engine";
import Chip from "@/components/Chip";
import ClothingThumb from "@/components/ClothingThumb";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import ScoreBar from "@/components/hud/ScoreBar";

const AESTHETICS = [
  "minimal", "streetwear", "smart casual", "old money",
  "vintage", "y2k", "monochrome", "formal", "athletic", "korean", "gym",
];

// Purely a visual readout while the real /api/generate-outfits request is
// in flight - cycles until the actual response returns, doesn't claim to
// track literal backend steps.
const STAGES = ["ANALYZING WARDROBE", "CHECKING WEATHER", "MATCHING COLORS", "SCORING COMPATIBILITY", "COMPOSITION READY"];
const PHOTO_STAGES = ["ANALYZING REFERENCE PHOTO", "EXTRACTING STYLE PROFILE", "MATCHING WARDROBE", "SCORING COMPATIBILITY", "COMPOSITION READY"];

export default function GeneratePage() {
  const [occasion, setOccasion] = useState("Casual");
  const [aesthetic, setAesthetic] = useState("minimal");
  const [weather, setWeather] = useState(() => {
    if (typeof window === "undefined") return "Warm";
    const params = new URLSearchParams(window.location.search);
    const w = params.get("weather");
    return w && ["Hot", "Warm", "Cool", "Cold", "Rainy"].includes(w) ? w : "Warm";
  });
  const [results, setResults] = useState<GeneratedOutfit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<number, "saving" | "saved" | "error">>({});

  const [mode, setMode] = useState<"free" | "locked" | "photo">("free");
  const [wardrobe, setWardrobe] = useState<ClothingItem[] | null>(null);
  const [lockedItem, setLockedItem] = useState<ClothingItem | null>(null);
  const wardrobeLoading = wardrobe === null;
  const [modifyingIdx, setModifyingIdx] = useState<number | null>(null);

  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<{ aesthetic: string; occasion: string; formality: number; primary_colors: string[]; silhouette?: string } | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  useEffect(() => {
    if (wardrobe) return;
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((data) => setWardrobe(data.items ?? []));
  }, [wardrobe]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setStageIdx(0);
    stageTimer.current = setInterval(() => setStageIdx((i) => (i < STAGES.length - 2 ? i + 1 : i)), 550);
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
      setStageIdx(STAGES.length - 1);
      setResults(data.outfits);
      if (!data.outfits?.length) setError("Not enough wardrobe items yet to build a full outfit — add a few more pieces.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
      setTimeout(() => setLoading(false), 350);
    }
  };

  const runFromPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB.");
      return;
    }

    setReferencePreview(URL.createObjectURL(file));
    setStyleProfile(null);
    setPhotoNote(null);
    setResults(null);
    setLoading(true);
    setError(null);
    setStageIdx(0);
    stageTimer.current = setInterval(() => setStageIdx((i) => (i < PHOTO_STAGES.length - 2 ? i + 1 : i)), 550);

    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/style-from-photo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not analyze reference photo");
      setStageIdx(PHOTO_STAGES.length - 1);
      setStyleProfile(data.styleProfile);
      setPhotoNote(data.note ?? null);
      setResults(data.outfits);
      if (!data.outfits?.length) setError("Not enough wardrobe items to match this reference — add a few more pieces.");
      if (data.styleProfile) {
        setAesthetic(data.styleProfile.aesthetic);
        setOccasion(data.styleProfile.occasion);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
      setTimeout(() => setLoading(false), 350);
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
        body: JSON.stringify({
          occasion,
          aesthetic,
          weather,
          score: r.overall,
          scoreBreakdown: { color: r.colorScore, weather: r.weatherScore, aesthetic: r.styleScore, occasion: r.occasionScore, layering: r.formalityScore },
          explanation: r.explanation,
          items,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus((s) => ({ ...s, [idx]: "saved" }));
    } catch {
      setSaveStatus((s) => ({ ...s, [idx]: "error" }));
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <TechLabel>[ STYLING ENGINE ]</TechLabel>
        <Link href="/outfits" className="tech-label" style={{ color: "var(--color-accent)" }}>SAVED →</Link>
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-5">
        GENERATE OUTFIT
      </h1>

      <div className="flex flex-wrap mb-6 rounded border p-1" style={{ borderColor: "var(--color-border)" }}>
        {(["free", "locked", "photo"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded text-[11px]"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.03em",
              background: mode === m ? "var(--color-accent)" : "transparent",
              color: mode === m ? "#06060a" : "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            {m === "free" ? "FREELY" : m === "locked" ? "START WITH ITEM" : "STYLE FROM PHOTO"}
          </button>
        ))}
      </div>

      {mode === "photo" && (
        <div className="mb-6">
          <label className="block cursor-pointer">
            <HUDPanel className="overflow-hidden hud-grid-bg" glow={loading}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && runFromPhoto(e.target.files[0])}
              />
              {referencePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referencePreview} alt="Reference" className="w-full h-44 object-cover" style={{ opacity: loading ? 0.5 : 1 }} />
                </div>
              ) : (
                <div className="flex flex-col items-center py-10">
                  <ImageUp size={22} color="var(--color-accent)" />
                  <p className="tech-label mt-3 text-center px-6">UPLOAD A REFERENCE OUTFIT PHOTO</p>
                  <p className="text-[10px] mt-1 text-center px-8" style={{ color: "var(--color-text-muted)" }}>
                    We&apos;ll match the style using only your own wardrobe
                  </p>
                </div>
              )}
            </HUDPanel>
          </label>

          {styleProfile && (
            <HUDPanel className="p-3 mt-3" brackets={false}>
              <TechLabel className="mb-2">STYLE PROFILE EXTRACTED</TechLabel>
              <p className="text-xs capitalize mb-1">
                {styleProfile.aesthetic} · {styleProfile.occasion} · Formality {styleProfile.formality}/10
              </p>
              {styleProfile.primary_colors?.length > 0 && (
                <p className="text-[11px] capitalize" style={{ color: "var(--color-text-muted)" }}>
                  Palette: {styleProfile.primary_colors.join(", ")}
                </p>
              )}
              {photoNote && <p className="text-[11px] mt-2" style={{ color: "var(--color-accent)" }}>{photoNote}</p>}
            </HUDPanel>
          )}
        </div>
      )}

      {mode === "locked" && (
        <div className="mb-6">
          {lockedItem ? (
            <HUDPanel className="p-4 mb-3 flex items-center gap-3" glow>
              <ClothingThumb imageUrl={lockedItem.image_url} name={lockedItem.name} category={lockedItem.category} color={lockedItem.primary_color} size={56} />
              <div className="flex-1">
                <p className="tech-label flex items-center gap-1 mb-0.5" style={{ color: "var(--color-accent)" }}>
                  <Lock size={10} /> SELECTED — LOCKED
                </p>
                <p className="text-sm">{lockedItem.name}</p>
              </div>
              <button onClick={() => setLockedItem(null)}>
                <X size={16} color="var(--color-text-muted)" />
              </button>
            </HUDPanel>
          ) : (
            <>
              <TechLabel className="mb-2">START WITH</TechLabel>
              {wardrobeLoading && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading your wardrobe...</p>}
              <div className="grid grid-cols-4 gap-2">
                {wardrobe?.map((item) => (
                  <button key={item.id} onClick={() => setLockedItem(item)} className="flex flex-col items-center">
                    <ClothingThumb imageUrl={item.image_url} name={item.name} category={item.category} color={item.primary_color} fill />
                    <p className="text-[9px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>{item.name}</p>
                  </button>
                ))}
              </div>
              {wardrobe && wardrobe.length === 0 && !wardrobeLoading && (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Add some clothes first to build an outfit around one.</p>
              )}
            </>
          )}
        </div>
      )}

      {mode !== "photo" && (
        <>
          <TechLabel className="mb-2">OCCASION</TechLabel>
          <div className="flex flex-wrap mb-4">
            {["Casual", "College", "Date", "Work", "Dinner"].map((o) => (
              <Chip key={o} label={o} active={occasion === o} onClick={() => setOccasion(o)} />
            ))}
          </div>

          <TechLabel className="mb-2">AESTHETIC</TechLabel>
          <div className="flex flex-wrap mb-4">
            {AESTHETICS.map((a) => (
              <Chip key={a} label={a} active={aesthetic === a} onClick={() => setAesthetic(a)} />
            ))}
          </div>

          <TechLabel className="mb-2">WEATHER</TechLabel>
          <div className="flex flex-wrap mb-6">
            {["Hot", "Warm", "Cool", "Cold", "Rainy"].map((w) => (
              <Chip key={w} label={w} active={weather === w} onClick={() => setWeather(w)} />
            ))}
          </div>

          <button
            onClick={run}
            disabled={loading || (mode === "locked" && !lockedItem)}
            className="btn-chrome w-full py-4 flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
          >
            <Sparkles size={16} /> {loading ? "GENERATING..." : "GENERATE OUTFITS"}
          </button>
        </>
      )}

      {loading && (
        <HUDPanel className="p-3 mb-6" brackets={false}>
          <p className="tech-label flex items-center gap-2" style={{ color: "var(--color-accent)" }}>
            <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
            {(mode === "photo" ? PHOTO_STAGES : STAGES)[stageIdx]}...
          </p>
        </HUDPanel>
      )}

      {error && <p className="text-xs mb-4" style={{ color: "var(--color-danger)" }}>{error}</p>}

      {results && (
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:items-start">
          {results.map((r, idx) => (
            <HUDPanel key={idx} className="p-4" glow={idx === 0}>
              <div className="flex items-center justify-between mb-3">
                <p className="tech-label">OUTFIT #{idx + 1}</p>
                <p className="text-xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
                  {r.overall}<span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/100</span>
                </p>
              </div>
              <div className="flex gap-3 mb-3 flex-wrap">
                {[r.top, r.bottom, r.shoes, r.outerwear, r.accessory, r.bag].filter(Boolean).map((item) => (
                  <div key={item!.id} className="flex flex-col items-center relative" style={{ width: 60 }}>
                    <ClothingThumb imageUrl={item!.image_url} name={item!.name} category={item!.category} color={item!.primary_color} size={56} />
                    {lockedItem && item!.id === lockedItem.id && (
                      <div className="absolute -top-1 -right-1 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: "var(--color-accent)" }}>
                        <Lock size={9} color="#06060a" />
                      </div>
                    )}
                    <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>{item!.name}</p>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <ScoreBar label="COLOR" value={r.colorScore} />
                <ScoreBar label="WEATHER" value={r.weatherScore} />
                <ScoreBar label="AESTHETIC" value={r.styleScore} />
                <ScoreBar label="OCCASION" value={r.occasionScore} />
                <ScoreBar label="LAYERING" value={r.formalityScore} />
              </div>

              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>{r.explanation}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => saveOutfit(idx, r)}
                  disabled={saveStatus[idx] === "saving" || saveStatus[idx] === "saved"}
                  className="btn-chrome flex-1 py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  {saveStatus[idx] === "saved" ? (<><Check size={13} /> SAVED</>) : saveStatus[idx] === "saving" ? "SAVING..." : "SAVE"}
                </button>
                <button onClick={() => setModifyingIdx(modifyingIdx === idx ? null : idx)} className="btn-outline flex-1 py-2 text-xs">
                  {modifyingIdx === idx ? "DONE" : "MODIFY"}
                </button>
              </div>

              {modifyingIdx === idx && wardrobe && (
                <div className="mt-3 pt-3 hud-divider">
                  {(["bottom", "shoes", "outerwear", "accessory", "bag"] as const).map((slot) => {
                    const current = r[slot];
                    if (lockedItem && current?.id === lockedItem.id) return null;
                    const alternatives = wardrobe.filter((w) => w.category === slot && w.id !== current?.id);
                    if (alternatives.length === 0 && !current) return null;
                    return (
                      <div key={slot} className="mb-3 mt-3">
                        <p className="tech-label mb-1.5 flex items-center gap-1"><ChevronDown size={10} /> {slot}</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {current && (
                            <button onClick={() => swapSlot(idx, slot, null)} className="text-[9px] px-2 py-1 rounded flex-shrink-0" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
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

              {saveStatus[idx] === "error" && <p className="text-[10px] mt-2" style={{ color: "var(--color-danger)" }}>Couldn&apos;t save - try again.</p>}
            </HUDPanel>
          ))}
        </div>
      )}
    </div>
  );
}
