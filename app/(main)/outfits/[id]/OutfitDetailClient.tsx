"use client";

import { useState } from "react";
import { Heart, ThumbsDown, ThumbsUp, CheckCircle2, CalendarPlus } from "lucide-react";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";

const NOTE_LIMIT = 100;
const PLAN_NOTE_LIMIT = 150;

export default function OutfitDetailClient({ outfitId, initialNote }: { outfitId: string; initialNote: string }) {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [wornSent, setWornSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const [note, setNote] = useState(initialNote);
  const [noteSaved, setNoteSaved] = useState(true);

  const [planningOpen, setPlanningOpen] = useState(false);
  const [planDate, setPlanDate] = useState("");
  const [planNote, setPlanNote] = useState("");
  const [planStatus, setPlanStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  const saveNote = async () => {
    const res = await fetch(`/api/outfits/${outfitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNoteSaved(res.ok);
  };

  const addToPlanner = async () => {
    if (!planDate) return;
    setPlanStatus("saving");
    const res = await fetch("/api/outfit-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outfitId, plannedDate: planDate, note: planNote }),
    });
    setPlanStatus(res.ok ? "saved" : "error");
  };

  return (
    <div className="mt-6">
      {/* Note */}
      <TechLabel className="mb-2">NOTE</TechLabel>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value.slice(0, NOTE_LIMIT));
          setNoteSaved(false);
        }}
        onBlur={saveNote}
        placeholder="e.g. Perfect for Friday dinner"
        rows={2}
        className="w-full mb-1 px-3 py-2 rounded text-sm outline-none border resize-none"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
      />
      <p className="text-[10px] mb-5 mono" style={{ color: noteSaved ? "var(--color-text-muted)" : "var(--color-accent)" }}>
        {note.length}/{NOTE_LIMIT}{!noteSaved ? " · saving on blur..." : ""}
      </p>

      {/* Feedback */}
      <TechLabel className="mb-2">HOW DO YOU FEEL ABOUT THIS ONE?</TechLabel>
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
            className="flex-1 py-2 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50"
            style={{
              border: `1px solid ${feedbackSent === key ? "var(--color-accent)" : "var(--color-border)"}`,
              color: feedbackSent === key ? "var(--color-accent)" : "var(--color-text-muted)",
              boxShadow: feedbackSent === key ? "0 0 12px rgba(157,140,255,0.25)" : "none",
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      {feedbackSent && <p className="text-xs mb-4" style={{ color: "var(--color-accent)" }}>Feedback saved.</p>}

      <button
        onClick={markWorn}
        disabled={busy || wornSent}
        className="btn-outline w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
      >
        <CheckCircle2 size={16} /> {wornSent ? "MARKED AS WORN" : "MARK AS WORN TODAY"}
      </button>

      {/* Add to planner */}
      {!planningOpen ? (
        <button onClick={() => setPlanningOpen(true)} className="btn-outline w-full py-3 flex items-center justify-center gap-2">
          <CalendarPlus size={16} /> ADD TO PLANNER
        </button>
      ) : (
        <HUDPanel className="p-4">
          <TechLabel className="mb-2">DATE</TechLabel>
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded text-sm outline-none border"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <TechLabel className="mb-2">NOTE (OPTIONAL)</TechLabel>
          <input
            value={planNote}
            onChange={(e) => setPlanNote(e.target.value.slice(0, PLAN_NOTE_LIMIT))}
            placeholder="e.g. College"
            className="w-full mb-3 px-3 py-2 rounded text-sm outline-none border"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <button
            onClick={addToPlanner}
            disabled={!planDate || planStatus === "saving"}
            className="btn-chrome w-full py-2.5 text-xs disabled:opacity-50"
          >
            {planStatus === "saved" ? "ADDED ✓" : planStatus === "saving" ? "ADDING..." : "CONFIRM"}
          </button>
          {planStatus === "error" && <p className="text-[10px] mt-2" style={{ color: "var(--color-danger)" }}>Couldn&apos;t add to planner.</p>}
        </HUDPanel>
      )}
    </div>
  );
}
