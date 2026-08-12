"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export default function OutfitFavoriteButton({ outfitId, initialFavorite }: { outfitId: string; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !favorite;
    setFavorite(next); // optimistic
    setBusy(true);
    const res = await fetch(`/api/outfits/${outfitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    setBusy(false);
    if (!res.ok) setFavorite(!next); // revert on failure
  };

  return (
    <button onClick={toggle} disabled={busy} className="transition-transform active:scale-90">
      <Heart size={20} color={favorite ? "#ff6b6b" : "var(--color-text-muted)"} fill={favorite ? "#ff6b6b" : "none"} />
    </button>
  );
}
