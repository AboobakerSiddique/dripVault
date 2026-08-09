export type ClothingCategory =
  | "top"
  | "bottom"
  | "shoes"
  | "accessory"
  | "bag"
  | "outerwear";

export interface ClothingItem {
  id: string;
  user_id?: string;
  name: string;
  category: ClothingCategory;
  sub_category?: string;
  primary_color: string;
  secondary_colors?: string[];
  pattern?: string;
  fit?: string;
  silhouette?: string;
  material?: string;
  style: string[];
  formality: number; // 1-10
  season?: string[];
  image_url?: string;
  favorite?: boolean;
  wear_count?: number;
  last_worn?: string | null;
  created_at?: string;
}

export interface GeneratedOutfit {
  top: ClothingItem;
  bottom: ClothingItem;
  shoes: ClothingItem;
  accessory?: ClothingItem;
  colorScore: number;
  styleScore: number;
  formalityScore: number;
  overall: number;
  explanation?: string;
}

export interface OutfitFilters {
  occasion?: string;
  aesthetic?: string;
  weather?: string;
  colorPreference?: string;
  fitPreference?: string;
  avoidRecentlyWorn?: boolean;
  useOnlyUnworn?: boolean;
  /** id of a clothing_items row the user picked to build the outfit around - that
   *  item is pinned into its category slot rather than searched over. */
  lockedItemId?: string;
}
