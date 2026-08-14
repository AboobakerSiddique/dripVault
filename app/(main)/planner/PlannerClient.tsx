"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import { ClothingItem } from "@/types/clothing";

interface OutfitSummary {
  id: string;
  aesthetic: string | null;
  occasion: string | null;
  favorite: boolean;
  outfit_items: { role: string; clothing_items: ClothingItem }[];
}
interface Plan {
  id: string;
  planned_date: string; // YYYY-MM-DD
  note: string | null;
  outfits: OutfitSummary;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}




function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return start;
}

export default function PlannerClient() {
  const [view, setView] = useState<"month" | "week">("week");
  const [anchor, setAnchor] = useState(new Date());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null); // date currently assigning
  const [savedOutfits, setSavedOutfits] = useState<OutfitSummary[] | null>(null);

  const { from, to } = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toISODate(start), to: toISODate(end) };
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: toISODate(start), to: toISODate(end) };
  }, [anchor, view]);

  const loadPlans = () => {
    fetch(`/api/outfit-plans?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []));
  };

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const openPicker = (date: string) => {
    setPickerOpen(date);
    if (!savedOutfits) {
      fetch("/api/outfits")
        .then((r) => r.json())
        .then((data) => setSavedOutfits(data.outfits ?? []));
    }
  };

  const assign = async (outfitId: string) => {
    if (!pickerOpen) return;
    await fetch("/api/outfit-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outfitId, plannedDate: pickerOpen }),
    });
    setPickerOpen(null);
    loadPlans();
  };

  const removePlan = async (planId: string) => {
    await fetch(`/api/outfit-plans/${planId}`, { method: "DELETE" });
    loadPlans();
  };

  const plansByDate = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const p of plans) {
      const list = map.get(p.planned_date) ?? [];
      list.push(p);
      map.set(p.planned_date, list);
    }
    return map;
  }, [plans]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first padding
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startPad).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
    return cells;
  }, [anchor]);

  const navigate = (dir: -1 | 1) => {
    const next = new Date(anchor);
    if (view === "week") next.setDate(anchor.getDate() + dir * 7);
    else next.setMonth(anchor.getMonth() + dir);
    setAnchor(next);
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <TechLabel className="mb-1">[ SCHEDULE MODULE ]</TechLabel>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl mb-4">
        OUTFIT PLANNER
      </h1>

      <div className="flex mb-5 rounded border p-1" style={{ borderColor: "var(--color-border)" }}>
        {(["week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 py-2 rounded text-xs uppercase"
            style={{
              fontFamily: "var(--font-display)",
              background: view === v ? "var(--color-accent)" : "transparent",
              color: view === v ? "#06060a" : "var(--color-text-muted)",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)}><ChevronLeft size={18} color="var(--color-text-muted)" /></button>
        <p className="tech-label">
          {view === "week"
            ? `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()}
        </p>
        <button onClick={() => navigate(1)}><ChevronRight size={18} color="var(--color-text-muted)" /></button>
      </div>

      {view === "week" ? (
        <div className="flex flex-col gap-2.5">
          {weekDays.map((d) => {
            const iso = toISODate(d);
            const dayPlans = plansByDate.get(iso) ?? [];
            return (
              <HUDPanel key={iso} className="p-3" brackets={false}>
                <div className="flex items-center justify-between mb-2">
                  <p className="tech-label">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }).toUpperCase()}</p>
                  <button onClick={() => openPicker(iso)}><Plus size={14} color="var(--color-accent)" /></button>
                </div>
                {dayPlans.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>No outfit planned</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayPlans.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {p.outfits.outfit_items.slice(0, 3).map((oi) => (
                            <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category} color={oi.clothing_items.primary_color} size={32} />
                          ))}
                        </div>
                        <p className="text-[10px] flex-1 capitalize" style={{ color: "var(--color-text-muted)" }}>
                          {p.outfits.aesthetic ?? "Outfit"}{p.note ? ` · ${p.note}` : ""}
                        </p>
                        <button onClick={() => removePlan(p.id)}><X size={12} color="var(--color-text-muted)" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </HUDPanel>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DOW.map((d) => (
              <p key={d} className="tech-label text-center">{d.toUpperCase()}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = toISODate(d);
              const hasPlans = (plansByDate.get(iso)?.length ?? 0) > 0;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className="aspect-square rounded flex flex-col items-center justify-center text-xs relative mono"
                  style={{
                    background: selectedDate === iso ? "var(--color-accent-dim)" : "var(--color-bg-2)",
                    border: `1px solid ${selectedDate === iso ? "var(--color-accent)" : "var(--color-border)"}`,
                  }}
                >
                  {d.getDate()}
                  {hasPlans && <span style={{ position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: "50%", background: "var(--color-cyan)" }} />}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <HUDPanel className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm">
  {(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  })()}
</p>
                <button onClick={() => openPicker(selectedDate)}><Plus size={16} color="var(--color-accent)" /></button>
              </div>
              {(plansByDate.get(selectedDate) ?? []).length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No outfit planned for this day</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(plansByDate.get(selectedDate) ?? []).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {p.outfits.outfit_items.slice(0, 4).map((oi) => (
                          <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category} color={oi.clothing_items.primary_color} size={40} />
                        ))}
                      </div>
                      <p className="text-xs flex-1 capitalize" style={{ color: "var(--color-text-muted)" }}>{p.outfits.aesthetic ?? "Outfit"}</p>
                      <button onClick={() => removePlan(p.id)}><X size={14} color="var(--color-text-muted)" /></button>
                    </div>
                  ))}
                </div>
              )}
            </HUDPanel>
          )}
        </>
      )}

      {/* Outfit picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(6,6,10,0.85)" }} onClick={() => setPickerOpen(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl p-5 border hud-grid-bg"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", maxHeight: "70vh", overflowY: "auto" }}
          >
            <TechLabel className="mb-4">ASSIGN OUTFIT TO {pickerOpen}</TechLabel>
            {!savedOutfits ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading...</p>
            ) : savedOutfits.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No saved outfits yet - save one from Generate first.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedOutfits.map((o) => (
                  <button key={o.id} onClick={() => assign(o.id)} className="text-left block">
                    <HUDPanel className="flex items-center gap-2 p-2" brackets={false}>
                      <div className="flex gap-1">
                        {o.outfit_items.slice(0, 3).map((oi) => (
                          <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category} color={oi.clothing_items.primary_color} size={36} />
                        ))}
                      </div>
                      <p className="text-xs capitalize">{o.aesthetic ?? "Outfit"}</p>
                    </HUDPanel>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
