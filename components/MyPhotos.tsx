"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Photo {
  id: string;
  image_url: string; // storage path
  signed_url: string | null;
}

const MIME_TO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MyPhotos() {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined); // undefined = loading
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch("/api/profile-photos")
      .then((r) => r.json())
      .then((data) => setPhoto(data.photo ?? null));
  };

  useEffect(() => {
    load();
  }, []);

  // Uploading when a photo already exists replaces it - the API deletes
  // the old row + Storage object before inserting the new one.
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

  const remove = async () => {
    if (!photo) return;
    await fetch(`/api/profile-photos/${photo.id}`, { method: "DELETE" });
    setPhoto(null);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>MY PHOTO</p>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>Optional · for future try-on</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: 76, height: 76 }}>
          {photo?.signed_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.signed_url}
              alt="Your photo"
              className="w-full h-full object-cover rounded-lg"
              style={{ border: "1px solid var(--color-border)" }}
            />
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading || photo === undefined}
              className="w-full h-full flex items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--color-border)", borderStyle: "dashed", background: "var(--color-bg-2)" }}
            >
              {uploading ? <Loader2 size={18} className="animate-spin" color="var(--color-text-muted)" /> : <Plus size={18} color="var(--color-text-muted)" />}
            </button>
          )}
        </div>

        {photo?.signed_url && (
          <div className="flex flex-col gap-2">
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-outline px-4 py-2 text-xs">
              {uploading ? "UPLOADING..." : "REPLACE"}
            </button>
            <button onClick={remove} className="text-xs flex items-center gap-1" style={{ color: "#ff6b6b" }}>
              <Trash2 size={12} /> DELETE
            </button>
          </div>
        )}

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
