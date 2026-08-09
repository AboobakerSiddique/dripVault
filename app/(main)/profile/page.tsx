"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { mockWardrobe } from "@/lib/mock-wardrobe";

const data = [
  { name: "Minimal", value: 80 },
  { name: "Streetwear", value: 60 },
  { name: "Smart casual", value: 45 },
];
const COLORS = ["#75c6ff", "#8a8a96", "#3b5a7a"];

export default function ProfilePage() {
  return (
    <div className="px-5 pt-8 pb-4 max-w-md mx-auto">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-xl mb-5">
        MY STYLE PROFILE
      </h1>

      <div
        className="rounded-2xl p-4 mb-5 flex items-center gap-4 border"
        style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}
      >
        <div style={{ width: 100, height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={30} outerRadius={45} startAngle={90} endAngle={-270}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i], display: "inline-block" }} />
                {d.name}
              </span>
              <span>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["Items", mockWardrobe.length], ["Outfits", 12], ["Days tracked", 16]].map(([label, n]) => (
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
        ))}
      </div>
    </div>
  );
}
