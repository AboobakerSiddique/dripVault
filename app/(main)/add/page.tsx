"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClothingCategory } from "@/types/clothing";
import Chip from "@/components/Chip";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";

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

// Content hash, not filename - two copies of the same photo saved under
// different names must still be caught. SHA-256 via Web Crypto (no library).
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Analysis {
  category: ClothingCategory;
  sub_category?: string;
  primary_color: string;
  secondary_colors?: string[];
  pattern?: string;
  fit?: string;
  silhouette?: string;
  material?: string;
  season?: string[];
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
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<{ id: string; name: string } | null>(null);

  const onFileSelected = async (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);
    setDuplicateOf(null);

    const hash = await hashFile(f);
    setImageHash(hash);

    try {
      const body = new FormData();
      body.append("image", f);
      body.append("hash", hash);
      const res = await fetch("/api/analyze-clothing", { method: "POST", body });
      const data = await res.json();

      if (res.status === 409) {
        setDuplicateOf(data.existingItem);
        return;
      }
      if (res.status === 422 && data.error === "not_clothing") {
        setError("This doesn't look like a clothing item - try a clear photo of a single wearable piece.");
        return;
      }
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
    // Hard guard: user.id must be a real Supabase Auth UUID. If this ever
    // fails, something is badly wrong upstream (a corrupted session) - fail
    // loudly here rather than silently uploading under a wrong/malformed
    // folder name.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(user.id)) {
      setError("Invalid session - please log out and back in.");
      setSaving(false);
      return;
    }
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
      silhouette: analysis.silhouette,
      material: analysis.material,
      season: analysis.season ?? [],
      style: styleText.split(",").map((s) => s.trim()).filter(Boolean),
      formality: analysis.formality,
      image_url: pub.publicUrl,
      image_hash: imageHash,
    });

    setSaving(false);
    if (insertError) {
      // Backstop for the database's own unique index (0009 migration) -
      // covers the tiny remaining race window between the pre-check above
      // and this insert (e.g. two near-simultaneous uploads of the same
      // image). Postgres unique-violation is error code 23505.
      if (insertError.code === "23505") {
        // Clean up the orphaned Storage object from the upload above -
        // don't leak it just because the row insert lost the race.
        await supabase.storage.from("clothing-images").remove([path]);
        const { data: existing } = await supabase
          .from("clothing_items")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("image_hash", imageHash)
          .maybeSingle();
        setDuplicateOf(existing ?? { id: "", name: "an existing item" });
        setAnalysis(null);
        return;
      }
      setError(insertError.message);
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
        <TechLabel>[ WARDROBE INTAKE ]</TechLabel>
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-5">
        SCAN / ANALYZE ITEM
      </h1>

      <label className="block mb-5 cursor-pointer">
        <HUDPanel className="overflow-hidden hud-grid-bg" glow={analyzing}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
          />
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full h-52 object-cover" style={{ opacity: analyzing ? 0.55 : 1 }} />
              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" color="var(--color-accent)" />
                  <p className="tech-label" style={{ color: "var(--color-accent)" }}>ANALYZING WARDROBE ITEM...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10">
              <ScanLine size={22} color="var(--color-accent)" />
              <p className="tech-label mt-3 text-center px-6">TAP TO SCAN OR UPLOAD PHOTO</p>
              <p className="text-[10px] mt-1 text-center px-8" style={{ color: "var(--color-text-muted)" }}>
                Color, category, and style detected automatically
              </p>
            </div>
          )}
        </HUDPanel>
      </label>

      {duplicateOf && (
        <HUDPanel className="p-4 mb-5" glow>
          <p className="tech-label mb-1" style={{ color: "var(--color-accent)" }}>[ DUPLICATE DETECTED ]</p>
          <p className="text-sm mb-1 mt-2">This item already exists in your wardrobe</p>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>Saved as &quot;{duplicateOf.name}&quot;</p>
          <Link href={`/wardrobe/${duplicateOf.id}`} className="btn-outline inline-block px-4 py-2 text-xs">
            VIEW EXISTING ITEM
          </Link>
        </HUDPanel>
      )}

      {error && (
        <p className="text-xs mb-4" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {analysis && !analyzing && !duplicateOf && (
        <>
          <HUDPanel className="p-4 mb-5">
            <TechLabel className="mb-3">[ ANALYSIS COMPLETE ]</TechLabel>

            <p className="tech-label mb-2">NAME</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-4 px-3 py-2.5 rounded text-sm outline-none border"
              style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />

            <p className="tech-label mb-2">CATEGORY — TAP TO CORRECT</p>
            <div className="flex flex-wrap mb-4">
              {CATS.map((c) => (
                <Chip key={c} label={c} active={analysis.category === c} onClick={() => setAnalysis({ ...analysis, category: c })} />
              ))}
            </div>

            <p className="tech-label mb-2">COLOR — EDIT FREELY</p>
            <input
              value={analysis.primary_color}
              onChange={(e) => setAnalysis({ ...analysis, primary_color: e.target.value })}
              placeholder="e.g. olive green"
              className="w-full mb-4 px-3 py-2.5 rounded text-sm outline-none border"
              style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />

            <p className="tech-label mb-2">STYLE TAGS</p>
            <input
              value={styleText}
              onChange={(e) => setStyleText(e.target.value)}
              className="w-full px-3 py-2.5 rounded text-sm outline-none border"
              style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </HUDPanel>

          <button
            onClick={save}
            disabled={saving}
            className="btn-chrome w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "SAVING..." : "ADD TO WARDROBE"}
          </button>
        </>
      )}
    </div>
  );
}
