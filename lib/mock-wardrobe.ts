import { ClothingItem } from "@/types/clothing";

// Temporary in-memory wardrobe so pages render end-to-end before
// clothing_items is wired to Supabase. Swap for a real fetch in Phase 3.
export const mockWardrobe: ClothingItem[] = [
  { id: "1", name: "Black Oversized Tee", category: "top", primary_color: "black", fit: "oversized", style: ["minimal", "streetwear"], formality: 2 },
  { id: "2", name: "White Oversized Tee", category: "top", primary_color: "white", fit: "oversized", style: ["minimal", "streetwear"], formality: 2 },
  { id: "3", name: "Cream Shirt", category: "top", primary_color: "cream", fit: "regular", style: ["minimal", "smart casual", "old money"], formality: 5 },
  { id: "4", name: "Olive Hoodie", category: "top", primary_color: "olive", fit: "relaxed", style: ["streetwear"], formality: 1 },
  { id: "5", name: "Blue Washed Jeans", category: "bottom", primary_color: "blue", fit: "regular", style: ["casual", "streetwear"], formality: 3 },
  { id: "6", name: "Black Relaxed Trousers", category: "bottom", primary_color: "black", fit: "relaxed", style: ["minimal", "smart casual"], formality: 5 },
  { id: "7", name: "Grey Trousers", category: "bottom", primary_color: "grey", fit: "relaxed", style: ["minimal", "smart casual"], formality: 5 },
  { id: "8", name: "Cargo Trousers", category: "bottom", primary_color: "black", fit: "relaxed", style: ["streetwear", "workwear"], formality: 2 },
  { id: "9", name: "White Sneakers", category: "shoes", primary_color: "white", fit: "regular", style: ["minimal", "casual", "smart casual"], formality: 4 },
  { id: "10", name: "Black Sneakers", category: "shoes", primary_color: "black", fit: "regular", style: ["streetwear", "casual"], formality: 3 },
  { id: "11", name: "Brown Watch", category: "accessory", primary_color: "brown", fit: "regular", style: ["minimal", "smart casual", "old money"], formality: 5 },
  { id: "12", name: "Leather Jacket", category: "outerwear", primary_color: "black", fit: "regular", style: ["streetwear", "minimal"], formality: 4 },
  { id: "13", name: "Canvas Tote Bag", category: "bag", primary_color: "brown", fit: "regular", style: ["casual", "streetwear"], formality: 2 },
];
