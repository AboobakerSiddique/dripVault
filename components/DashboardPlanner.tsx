"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import ClothingThumb from "@/components/ClothingThumb";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import { ClothingItem } from "@/types/clothing";

interface PlanOutfit {
  id: string;
  aesthetic: string | null;
  outfit_items: { clothing_items: ClothingItem }[];
}
interface DayPlan {
  id: string;
  note: string | null;
  outfits: PlanOutfit;
}

interface Props {
  year: number;
  month: number; // 0-indexed
  today: number;
  startPad: number;
  daysInMonth: number;
  plannedDates: string[]; // ISO dates with at least one plan, for the dot indicator
  weekDays: { iso: string; label: string }[];
  weekPlansByDate: Record<string, DayPlan[]>;
}

// Reuses the existing /api/outfit-plans route (same one /planner uses) -
// no second planner data system. The month grid only carries date-level
// dots server-side (cheap); clicking a day lazy-fetches that day's actual
// plans from the same endpoint instead of shipping the whole month's
// outfit_items down for every dashboard load.
export default function DashboardPlanner({ year, month, today, startPad, daysInMonth, plannedDates, weekDays, weekPlansByDate }: Props) {
  const plannedSet = new Set(plannedDates);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(false);

  const selectDate = async (iso: string) => {
    if (selectedDate === iso) {
      setSelectedDate(null);
      setSelectedPlans(null);
      return;
    }
    setSelectedDate(iso);
    setLoading(true);
    const res = await fetch(`/api/outfit-plans?from=${iso}&to=${iso}`);
    const data = await res.json();
    setSelectedPlans(data.plans ?? []);
    setLoading(false);
  };

  return (
    <>
      {/* Calendar */}
      <div className="flex items-center justify-between mb-3">
        <TechLabel>OUTFIT CALENDAR</TechLabel>
        <Link href="/planner" className="tech-label" style={{ color: "var(--color-accent)" }}>VIEW →</Link>
      </div>
      <HUDPanel className="p-4 mb-3" brackets={false}>
        <p className="text-xs mb-3">{new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const iso = new Date(year, month, dayNum).toISOString().slice(0, 10);
            const isToday = dayNum === today;
            const isSelected = selectedDate === iso;
            const hasPlan = plannedSet.has(iso);
            return (
              <button
                key={iso}
                onClick={() => selectDate(iso)}
                className="aspect-square rounded flex items-center justify-center text-[10px] mono relative"
                style={{
                  background: isSelected ? "var(--color-accent-dim)" : isToday ? "rgba(157,140,255,0.08)" : "transparent",
                  border: isSelected ? "1px solid var(--color-accent)" : isToday ? "1px solid rgba(157,140,255,0.3)" : "1px solid transparent",
                  color: isSelected || isToday ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              >
                {dayNum}
                {hasPlan && <span style={{ position: "absolute", bottom: 2, width: 3, height: 3, borderRadius: "50%", background: "var(--color-cyan)" }} />}
              </button>
            );
          })}
        </div>
      </HUDPanel>

      {selectedDate && (
        <HUDPanel className="p-3 mb-7" brackets={false}>
          <div className="flex items-center justify-between mb-2">
            <p className="tech-label">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</p>
            <Link href="/planner" className="flex items-center gap-1 tech-label" style={{ color: "var(--color-accent)" }}>
              <Plus size={11} /> ADD
            </Link>
          </div>
          {loading ? (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Loading...</p>
          ) : !selectedPlans || selectedPlans.length === 0 ? (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>No outfit planned</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedPlans.map((p) => (
                <Link key={p.id} href={`/outfits/${p.outfits.id}`} className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {p.outfits.outfit_items.slice(0, 4).map((oi) => (
                      <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category} color={oi.clothing_items.primary_color} size={36} />
                    ))}
                  </div>
                  <p className="text-[11px] flex-1 capitalize truncate" style={{ color: "var(--color-text-muted)" }}>{p.note ?? p.outfits.aesthetic ?? "Outfit"}</p>
                </Link>
              ))}
            </div>
          )}
        </HUDPanel>
      )}

      {/* Weekly planner */}
      <div className="flex items-center justify-between mb-3">
        <TechLabel>WEEKLY PLANNER</TechLabel>
        <Link href="/planner" className="tech-label" style={{ color: "var(--color-accent)" }}>VIEW →</Link>
      </div>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-2.5">
        {weekDays.map(({ iso, label }) => {
          const plans = weekPlansByDate[iso] ?? [];
          const plan = plans[0];
          const content = (
            <HUDPanel className="p-2.5 flex items-center gap-3" brackets={false}>
              <p className="tech-label" style={{ width: 34, flexShrink: 0 }}>{label}</p>
              {plan ? (
                <>
                  <div className="flex gap-1">
                    {plan.outfits.outfit_items.slice(0, 2).map((oi) => (
                      <ClothingThumb key={oi.clothing_items.id} imageUrl={oi.clothing_items.image_url} name={oi.clothing_items.name} category={oi.clothing_items.category} color={oi.clothing_items.primary_color} size={28} />
                    ))}
                  </div>
                  <p className="text-[11px] flex-1 truncate" style={{ color: "var(--color-text-muted)" }}>{plan.note ?? plan.outfits.aesthetic ?? "Outfit"}</p>
                </>
              ) : (
                <p className="text-[11px] flex-1" style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>No outfit planned</p>
              )}
            </HUDPanel>
          );
          return (
            <Link key={iso} href={plan ? `/outfits/${plan.outfits.id}` : "/planner"} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </>
  );
}
