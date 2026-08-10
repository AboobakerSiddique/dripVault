"use client";

import { useState } from "react";
import { Heart, ThumbsDown, ThumbsUp, CheckCircle2 } from "lucide-react";

export default function OutfitDetailClient({ outfitId }: { outfitId: string }) {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [wornSent, setWornSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendFeedback = async (rating: string) => {
    setBusy(true);
    const res = await fetch(`/api/outfits/${outfitId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setBusy(false);
    if (res.ok) setFeedbackSent(rating);
  };

  const markWorn = async () => {
    setBusy(true);
    const res = await fetch(`/api/outfits/${outfitId}/wear`, { method: "POST" });
    setBusy(false);
    if (res.ok) setWornSent(true);
  };

  return (
    <div className="mt-6">
      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>How do you feel about this one?</p>
      <div className="flex gap-2 mb-4">
        {[
          { key: "love", icon: Heart, label: "LOVE" },
          { key: "like", icon: ThumbsUp, label: "LIKE" },
          { key: "dislike", icon: ThumbsDown, label: "DISLIKE" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            disabled={busy}
            onClick={() => sendFeedback(key)}
            className="flex-1 py-2 rounded-full text-xs flex items-center justify-center gap-1 disabled:opacity-50"
            style={{
              border: `1px solid ${feedbackSent === key ? "var(--color-accent)" : "var(--color-border)"}`,
              color: feedbackSent === key ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      {feedbackSent && (
        <p className="text-xs mb-4" style={{ color: "var(--color-accent)" }}>Feedback saved.</p>
      )}

      <button
        onClick={markWorn}
        disabled={busy || wornSent}
        className="btn-outline w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CheckCircle2 size={16} /> {wornSent ? "MARKED AS WORN" : "MARK AS WORN TODAY"}
      </button>
    </div>
  );
}
