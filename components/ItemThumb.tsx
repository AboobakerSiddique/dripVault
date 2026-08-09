import { Shirt, Layers, Footprints, Watch, ShoppingBag, Sparkles } from "lucide-react";
import { ClothingCategory } from "@/types/clothing";

const CAT_ICON: Record<ClothingCategory, typeof Shirt> = {
  top: Shirt,
  bottom: Layers,
  shoes: Footprints,
  accessory: Watch,
  bag: ShoppingBag,
  outerwear: Sparkles,
};

const SWATCH: Record<string, string> = {
  black: "#232228",
  white: "#e8e9ee",
  cream: "#e4dcc8",
  grey: "#5f6270",
  blue: "#3b5a7a",
  brown: "#6b5842",
  olive: "#5c6b48",
};

export default function ItemThumb({
  category,
  color,
  size = 56,
}: {
  category: ClothingCategory;
  color: string;
  size?: number;
}) {
  const Icon = CAT_ICON[category] ?? Shirt;
  const bg = SWATCH[color.toLowerCase()] ?? "var(--color-bg-2)";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--color-border)",
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.42} color="#75c6ff" strokeWidth={1.5} style={{ opacity: 0.85 }} />
    </div>
  );
}
