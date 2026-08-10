"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Photo {
  id: string;
  image_url: string; // storage path
  signed_url: string | null;
  is_active: boolean;
}

const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MyPhotos() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch("/api/profile-photos")
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !UUID_RE.test(user.id)) throw new Error("Invalid session - please log out and back in.");

      const ext = MIME_TO_EXT[file.type.toLowerCase()] ?? "jpg";
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file);
      if (uploadError) throw uploadError;

      const res = await fetch("/api/profile-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save photo");

      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setActive = async (id: string) => {
    await fetch(`/api/profile-photos/${id}`, { method: "PATCH" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/profile-photos/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>MY PHOTOS</p>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>Optional · for future try-on</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {photos?.map((p) => (
          <div key={p.id} className="relative" style={{ width: 68, height: 68 }}>
            {p.signed_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.signed_url}
                alt="Profile"
                onClick={() => setActive(p.id)}
                className="w-full h-full object-cover rounded-lg cursor-pointer"
                style={{ border: p.is_active ? "2px solid var(--color-accent)" : "1px solid var(--color-border)" }}
              />
            )}
            {p.is_active && (
              <div className="absolute -top-1 -right-1 rounded-full flex items-center justify-center" style={{ width: 18, height: 18, background: "var(--color-accent)" }}>
                <Star size={10} color="#08080b" fill="#08080b" />
              </div>
            )}
            <button
              onClick={() => remove(p.id)}
              className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
              style={{ width: 18, height: 18, background: "var(--color-bg-1)", border: "1px solid var(--color-border)" }}
            >
              <Trash2 size={9} color="#ff6b6b" />
            </button>
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center rounded-lg border"
          style={{ width: 68, height: 68, borderColor: "var(--color-border)", borderStyle: "dashed", background: "var(--color-bg-2)" }}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" /> : <Plus size={18} color="var(--color-text-muted)" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs mt-2" style={{ color: "#ff6b6b" }}>{error}</p>}
    </div>
  );
}
