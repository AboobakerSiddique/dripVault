import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
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

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/outfits">
          <ChevronLeft size={20} color="var(--color-text-muted)" />
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl capitalize">
          {[outfit.aesthetic, outfit.occasion].filter(Boolean).join(" · ") || "Outfit"}
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {items.map(({ role, clothing_items: item }) => (
          <div key={item.id} className="flex flex-col items-center" style={{ width: 72 }}>
            <ClothingThumb imageUrl={item.image_url} name={item.name} category={item.category} color={item.primary_color} size={68} />
            <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: "var(--color-text-muted)" }}>{item.name}</p>
            <p className="text-[9px] uppercase" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>{role}</p>
          </div>
        ))}
      </div>

      {outfit.score != null && (
        <p className="text-xs mb-3" style={{ color: "var(--color-accent)" }}>Style match: {outfit.score}</p>
      )}
      {outfit.explanation && (
        <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--color-text-muted)" }}>{outfit.explanation}</p>
      )}
      <p className="text-[11px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
        Saved {new Date(outfit.created_at).toLocaleDateString()}
        {outfit.weather ? ` · ${outfit.weather} weather` : ""}
      </p>

      <OutfitDetailClient outfitId={outfit.id} />
    </div>
  );
}
