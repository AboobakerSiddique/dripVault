import Link from "next/link";
import { Cloud, Sparkles } from "lucide-react";
import { mockWardrobe } from "@/lib/mock-wardrobe";

export default function HomePage() {
  const counts = { top: 0, bottom: 0, shoes: 0, accessory: 0 };
  mockWardrobe.forEach((i) => {
    if (i.category in counts) counts[i.category as keyof typeof counts]++;
  });

  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Good morning
      </p>
      <h1
        className="text-2xl mt-1 mb-6"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        WHAT&apos;S THE PLAN TODAY?
      </h1>

      <Link
        href="/generate"
        className="btn-chrome w-full py-3 flex items-center justify-center gap-2 mb-6"
      >
        <Sparkles size={16} /> STYLE ME
      </Link>

      <div
        className="rounded-2xl p-4 mb-6 flex items-center justify-between border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Weather now
          </p>
          <p className="text-xl mt-1">
            28° <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Partly cloudy</span>
          </p>
        </div>
        <Cloud size={28} color="var(--color-text-muted)" />
      </div>

      <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
        Your wardrobe · {mockWardrobe.length} items
      </p>
      <div className="grid grid-cols-4 gap-2">
        {[["Tops", counts.top], ["Bottoms", counts.bottom], ["Shoes", counts.shoes], ["Acc.", counts.accessory]].map(
          ([label, n]) => (
            <div
              key={label as string}
              className="rounded-xl p-3 text-center border"
              style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
            >
              <p className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                {n}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {label}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
