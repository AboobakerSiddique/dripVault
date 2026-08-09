"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClothingCategory } from "@/types/clothing";
import Chip from "@/components/Chip";

const CATS: ClothingCategory[] = ["top", "bottom", "shoes", "accessory", "bag", "outerwear"];

// Never derive a Storage key from the user's original filename - it can
// contain characters Supabase Storage rejects (unicode symbols, *, #, etc,
// as seen with "**.jpg"). Extension comes from a validated MIME whitelist
// first, falling back to a validated (not raw) extension check on the name.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

function safeExtension(file: File): string {
  const byMime = MIME_TO_EXT[file.type.toLowerCase()];
  if (byMime) return byMime;

  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = match?.[1];
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return ext === "jpeg" ? "jpg" : ext;

  return "jpg"; // safe default - never propagate an unvalidated extension
}

function safeStorageFilename(file: File): string {
  const ext = safeExtension(file);
  const id = crypto.randomUUID();
  return `${Date.now()}-${id}.${ext}`;
}

interface Analysis {
  category: ClothingCategory;
  sub_category?: string;
  primary_color: string;
  secondary_colors?: string[];
  pattern?: string;
  fit?: string;
  style: string[];
  formality: number;
}

export default function AddPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [name, setName] = useState("");
  const [styleText, setStyleText] = useState("");

  const onFileSelected = async (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const body = new FormData();
      body.append("image", f);
      const res = await fetch("/api/analyze-clothing", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");

      setAnalysis(data);
      setStyleText((data.style ?? []).join(", "));
      setName(`${data.primary_color} ${data.sub_category ?? data.category}`.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed - you can still fill this in manually.");
      setAnalysis({ category: "top", primary_color: "", style: [], formality: 5 });
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!file || !analysis || !name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired - please log in again.");
      setSaving(false);
      return;
    }

    // Path shape ({user_id}/filename) is unchanged, so existing storage RLS
    // policies (which check the first folder segment against auth.uid())
    // keep working exactly as before - only the filename itself changed.
    const path = `${user.id}/${safeStorageFilename(file)}`;
    const { error: uploadError } = await supabase.storage.from("clothing-images").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { data: pub } = supabase.storage.from("clothing-images").getPublicUrl(path);

    const { error: insertError } = await supabase.from("clothing_items").insert({
      user_id: user.id,
      name,
      category: analysis.category,
      sub_category: analysis.sub_category,
      primary_color: analysis.primary_color,
      secondary_colors: analysis.secondary_colors ?? [],
      pattern: analysis.pattern,
      fit: analysis.fit,
      style: styleText.split(",").map((s) => s.trim()).filter(Boolean),
      formality: analysis.formality,
      image_url: pub.publicUrl,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
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
          ADD CLOTHING
        </h1>
      </div>

      <label
        className="rounded-2xl mb-5 flex flex-col items-center justify-center border border-dashed cursor-pointer overflow-hidden"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", minHeight: 180 }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="w-full h-44 object-cover" />
        ) : (
          <div className="flex flex-col items-center py-8">
            <ImagePlus size={22} color="var(--color-text-muted)" />
            <p className="text-xs mt-2 text-center px-4" style={{ color: "var(--color-text-muted)" }}>
              Tap to take a photo or upload one - color, style, and category are detected automatically
            </p>
          </div>
        )}
      </label>

      {analyzing && (
        <div className="flex items-center gap-2 mb-5 text-sm" style={{ color: "var(--color-accent)" }}>
          <Loader2 size={16} className="animate-spin" /> Analyzing item...
        </div>
      )}

      {error && (
        <p className="text-xs mb-4" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      )}

      {analysis && !analyzing && (
        <>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />

          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Category (AI detected — tap to correct)</p>
          <div className="flex flex-wrap mb-4">
            {CATS.map((c) => (
              <Chip
                key={c}
                label={c}
                active={analysis.category === c}
                onClick={() => setAnalysis({ ...analysis, category: c })}
              />
            ))}
          </div>

          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Color (AI detected — edit freely)</p>
          <input
            value={analysis.primary_color}
            onChange={(e) => setAnalysis({ ...analysis, primary_color: e.target.value })}
            placeholder="e.g. olive green"
            className="w-full mb-4 px-3 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />

          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Style tags (comma separated)</p>
          <input
            value={styleText}
            onChange={(e) => setStyleText(e.target.value)}
            className="w-full mb-6 px-3 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />

          <button
            onClick={save}
            disabled={saving}
            className="btn-chrome w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "SAVING..." : "SAVE ITEM"}
          </button>
        </>
      )}
    </div>
  );
}
