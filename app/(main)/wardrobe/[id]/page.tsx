import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClothingItem } from "@/types/clothing";
import EditItemForm from "./EditItemForm";

export default async function WardrobeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!item) notFound();

  return <EditItemForm item={item as ClothingItem} />;
}
