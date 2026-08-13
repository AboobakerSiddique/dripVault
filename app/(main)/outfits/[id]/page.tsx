import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
import OutfitFavoriteButton from "@/components/OutfitFavoriteButton";
import HUDPanel from "@/components/hud/HUDPanel";
import TechLabel from "@/components/hud/TechLabel";
import ScoreBar from "@/components/hud/ScoreBar";
import { ClothingItem } from "@/types/clothing";
import OutfitDetailClient from "./OutfitDetailClient";

export default async function OutfitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: outfit } = await supabase
    .from("outfits")
    .select("*, outfit_items(role, clothing_items(*))")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!outfit) notFound();

  const items = (outfit.outfit_items ?? []) as { role: string; clothing_items: ClothingItem }[];
  const breakdown = outfit.score_breakdown as { color: number; weather: number; aesthetic: number; occasion: number; layering: number } | null;

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/outfits">
          <ChevronLeft size={20} color="var(--color-text-muted)" />
        </Link>
        <TechLabel>[ OUTFIT RECORD ]</TechLabel>
      </div>
      <div className="flex items-center justify-between mb-5">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} className="text-xl capitalize">
          {[outfit.aesthetic, outfit.occasion].filter(Boolean).join(" · ") || "Outfit"}
        </h1>
        <OutfitFavoriteButton outfitId={outfit.id} initialFavorite={!!outfit.favorite} />
      </div>

      <HUDPanel className="p-3 mb-5 hud-grid-bg" glow>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {items.map(({ role, clothing_items: item }) => (
            <div key={item.id} className="flex flex-col items-center">
              <ClothingThumb imageUrl={item.image_url} name={item.name} category={item.category} color={item.primary_color} fill />
              <p className="text-[10px] mt-1 text-center leading-tight truncate w-full">{item.name}</p>
              <p className="tech-label">{role}</p>
            </div>
          ))}
        </div>

        {outfit.score != null && (
          <div className="flex items-center justify-between mb-2">
            <TechLabel>STYLE MATCH</TechLabel>
            <p className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", textShadow: "0 0 16px rgba(157,140,255,0.4)" }}>
              {outfit.score}<span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/100</span>
            </p>
          </div>
        )}

        {breakdown && (
          <div className="mb-3">
            <ScoreBar label="COLOR" value={breakdown.color} />
            <ScoreBar label="WEATHER" value={breakdown.weather} />
            <ScoreBar label="AESTHETIC" value={breakdown.aesthetic} />
            <ScoreBar label="OCCASION" value={breakdown.occasion} />
            <ScoreBar label="LAYERING" value={breakdown.layering} />
          </div>
        )}

        {outfit.explanation && (
          <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--color-text-muted)" }}>{outfit.explanation}</p>
        )}
        <p className="tech-label">
          SAVED {new Date(outfit.created_at).toLocaleDateString().toUpperCase()}
          {outfit.weather ? ` · ${outfit.weather.toUpperCase()}` : ""}
        </p>
      </HUDPanel>

      <OutfitDetailClient outfitId={outfit.id} initialNote={outfit.note ?? ""} />
    </div>
  );
}
