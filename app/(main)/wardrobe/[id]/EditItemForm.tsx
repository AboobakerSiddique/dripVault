"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Heart, Loader2, Trash2 } from "lucide-react";
import Chip from "@/components/Chip";
import ClothingThumb from "@/components/ClothingThumb";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import { ClothingCategory, ClothingItem } from "@/types/clothing";

const CATS: ClothingCategory[] = ["top", "bottom", "shoes", "accessory", "bag", "outerwear"];
const FITS = ["slim", "regular", "relaxed", "oversized"];

export default function EditItemForm({ item }: { item: ClothingItem }) {
  const router = useRouter();
  const [category, setCategory] = useState<ClothingCategory>(item.category);
  const [primaryColor, setPrimaryColor] = useState(item.primary_color);
  const [material, setMaterial] = useState(item.material ?? "");
  const [fit, setFit] = useState(item.fit ?? "");
  const [formality, setFormality] = useState(item.formality);
  const [styleText, setStyleText] = useState((item.style ?? []).join(", "));
  const [favorite, setFavorite] = useState(item.favorite ?? false);
  const [seasonText, setSeasonText] = useState((item.season ?? []).join(", "));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/wardrobe/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        primary_color: primaryColor,
        material: material || null,
        fit: fit || null,
        formality,
        style: styleText.split(",").map((s) => s.trim()).filter(Boolean),
        season: seasonText.split(",").map((s) => s.trim()).filter(Boolean),
        favorite,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save changes");
      return;
    }
    router.push("/wardrobe");
    router.refresh();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/wardrobe/${item.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete item");
      setConfirmingDelete(false);
      return;
    }
    router.push("/wardrobe");
    router.refresh();
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => router.push("/wardrobe")}>
          <ChevronLeft size={20} color="var(--color-text-muted)" />
        </button>
        <TechLabel>[ ITEM RECORD ]</TechLabel>
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-5">
        EDIT ITEM
      </h1>

      <div className="flex justify-center mb-6">
        <HUDPanel className="p-2 relative" glow>
          <ClothingThumb imageUrl={item.image_url} name={item.name} category={category} color={primaryColor} size={140} />
          <button
            onClick={() => setFavorite((f) => !f)}
            className="absolute top-2 right-2 rounded flex items-center justify-center"
            style={{ width: 30, height: 30, background: "rgba(6,6,10,0.75)" }}
          >
            <Heart size={15} color={favorite ? "var(--color-danger)" : "#fff"} fill={favorite ? "var(--color-danger)" : "none"} />
          </button>
        </HUDPanel>
      </div>

      <TechLabel className="mb-2">CATEGORY</TechLabel>
      <div className="flex flex-wrap mb-4">
        {CATS.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <TechLabel className="mb-2">COLOR</TechLabel>
      <input
        value={primaryColor}
        onChange={(e) => setPrimaryColor(e.target.value)}
        className="w-full mb-4 px-3 py-2.5 rounded text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <TechLabel className="mb-2">FIT</TechLabel>
      <div className="flex flex-wrap mb-4">
        {FITS.map((f) => (
          <Chip key={f} label={f} active={fit === f} onClick={() => setFit(f)} />
        ))}
      </div>

      <TechLabel className="mb-2">MATERIAL</TechLabel>
      <input
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        placeholder="e.g. cotton"
        className="w-full mb-4 px-3 py-2.5 rounded text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <TechLabel className="mb-2">FORMALITY ({formality}/10)</TechLabel>
      <input
        type="range"
        min={1}
        max={10}
        value={formality}
        onChange={(e) => setFormality(Number(e.target.value))}
        className="w-full mb-4"
      />

      <TechLabel className="mb-2">STYLE TAGS</TechLabel>
      <input
        value={styleText}
        onChange={(e) => setStyleText(e.target.value)}
        className="w-full mb-4 px-3 py-2.5 rounded text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <TechLabel className="mb-2">SEASON</TechLabel>
      <input
        value={seasonText}
        onChange={(e) => setSeasonText(e.target.value)}
        placeholder="e.g. summer, spring"
        className="w-full mb-6 px-3 py-2.5 rounded text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      {error && <p className="text-xs mb-4" style={{ color: "var(--color-danger)" }}>{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="btn-chrome w-full py-3.5 flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? "SAVING..." : "SAVE CHANGES"}
      </button>

      {!confirmingDelete ? (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-xs rounded border"
          style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
        >
          <Trash2 size={14} /> DELETE THIS ITEM
        </button>
      ) : (
        <HUDPanel className="p-4" brackets={false} glow>
          <p className="text-sm mb-1">Delete this clothing item?</p>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            This will remove it from your wardrobe. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded text-xs disabled:opacity-50"
              style={{ background: "var(--color-danger)", color: "#06060a", fontWeight: 600 }}
            >
              {deleting ? "DELETING..." : "YES, DELETE"}
            </button>
            <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="flex-1 py-2 rounded text-xs btn-outline">
              CANCEL
            </button>
          </div>
        </HUDPanel>
      )}
    </div>
  );
}
