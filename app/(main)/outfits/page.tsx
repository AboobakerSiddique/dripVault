import { createClient } from "@/lib/supabase/server";
import OutfitsListClient from "./OutfitsListClient";

export default async function SavedOutfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("outfits")
    .select("*, outfit_items(role, clothing_items(*))")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <OutfitsListClient outfits={data ?? []} />;
}
