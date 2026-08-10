import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClothingThumb from "@/components/ClothingThumb";
import { ClothingItem } from "@/types/clothing";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: wardrobe } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const items = (wardrobe ?? []) as ClothingItem[];

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl">
          MY WARDROBE
        </h1>
        <div className="flex gap-3">
          <Search size={18} color="var(--color-text-muted)" />
          <SlidersHorizontal size={18} color="var(--color-text-muted)" />
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>{items.length} items</p>

      {items.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center border"
          style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            No clothes added yet
          </p>
          <Link href="/add" className="btn-chrome inline-flex items-center gap-2 px-4 py-2 text-xs">
            <Plus size={14} /> ADD CLOTHING
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/wardrobe/${item.id}`}
              className="rounded-xl p-2.5 border block"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <ClothingThumb
                imageUrl={item.image_url}
                name={item.name}
                category={item.category}
                color={item.primary_color}
                fill
              />
              <p className="text-xs mt-2" style={{ fontWeight: 500 }}>{item.name}</p>
              <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--color-text-muted)" }}>
                {item.style?.[0] ?? item.primary_color}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
