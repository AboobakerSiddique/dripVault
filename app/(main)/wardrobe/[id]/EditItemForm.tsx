"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2, Trash2 } from "lucide-react";
import Chip from "@/components/Chip";
import ClothingThumb from "@/components/ClothingThumb";
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
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/wardrobe")}>
          <ChevronLeft size={20} color="var(--color-text-muted)" />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          EDIT ITEM
        </h1>
      </div>

      <div className="flex justify-center mb-6">
        <ClothingThumb imageUrl={item.image_url} name={item.name} category={category} color={primaryColor} size={140} />
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Category</p>
      <div className="flex flex-wrap mb-4">
        {CATS.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Color</p>
      <input
        value={primaryColor}
        onChange={(e) => setPrimaryColor(e.target.value)}
        className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Fit</p>
      <div className="flex flex-wrap mb-4">
        {FITS.map((f) => (
          <Chip key={f} label={f} active={fit === f} onClick={() => setFit(f)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Material</p>
      <input
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        placeholder="e.g. cotton"
        className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
        Formality ({formality}/10)
      </p>
      <input
        type="range"
        min={1}
        max={10}
        value={formality}
        onChange={(e) => setFormality(Number(e.target.value))}
        className="w-full mb-4"
      />

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Style tags (comma separated)</p>
      <input
        value={styleText}
        onChange={(e) => setStyleText(e.target.value)}
        className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Season (comma separated)</p>
      <input
        value={seasonText}
        onChange={(e) => setSeasonText(e.target.value)}
        placeholder="e.g. summer, spring"
        className="w-full mb-6 px-3 py-2.5 rounded-lg text-sm outline-none border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />

      {error && (
        <p className="text-xs mb-4" style={{ color: "#ff6b6b" }}>{error}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="btn-chrome w-full py-3 flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? "SAVING..." : "SAVE CHANGES"}
      </button>

      {!confirmingDelete ? (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-xs rounded-full border"
          style={{ borderColor: "#ff6b6b", color: "#ff6b6b" }}
        >
          <Trash2 size={14} /> DELETE THIS ITEM
        </button>
      ) : (
        <div className="rounded-2xl p-4 border" style={{ borderColor: "#ff6b6b", background: "rgba(255,107,107,0.08)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text)" }}>Delete this clothing item?</p>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            This will remove it from your wardrobe. This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded-full text-xs disabled:opacity-50"
              style={{ background: "#ff6b6b", color: "#08080b", fontWeight: 600 }}
            >
              {deleting ? "DELETING..." : "YES, DELETE"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="flex-1 py-2 rounded-full text-xs btn-outline"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
