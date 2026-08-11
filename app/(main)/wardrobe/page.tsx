import { createClient } from "@/lib/supabase/server";
import { ClothingItem } from "@/types/clothing";
import WardrobeClient from "./WardrobeClient";

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

  return <WardrobeClient items={(wardrobe ?? []) as ClothingItem[]} />;
}
