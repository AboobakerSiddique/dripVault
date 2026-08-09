import ItemThumb from "@/components/ItemThumb";
import { ClothingCategory } from "@/types/clothing";

export default function ClothingThumb({
  imageUrl,
  name,
  category,
  color,
  size = 56,
  fill = false,
  rounded = "rounded-lg",
}: {
  imageUrl?: string | null;
  name: string;
  category: ClothingCategory;
  color: string;
  size?: number;
  /** Fill the parent's width and stay square, instead of a fixed pixel size (grids). */
  fill?: boolean;
  rounded?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={fill ? `w-full aspect-square object-cover ${rounded}` : `object-cover ${rounded}`}
        style={fill ? { border: "1px solid var(--color-border)" } : { width: size, height: size, border: "1px solid var(--color-border)", flexShrink: 0 }}
      />
    );
  }
  if (fill) {
    return (
      <div className={`w-full aspect-square flex items-center justify-center ${rounded}`} style={{ background: "var(--color-bg-2)", border: "1px solid var(--color-border)" }}>
        <ItemThumb category={category} color={color} size={size} />
      </div>
    );
  }
  return <ItemThumb category={category} color={color} size={size} />;
}
