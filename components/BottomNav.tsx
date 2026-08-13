"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Plus, Calendar, User } from "lucide-react";

const items = [
  { href: "/home", icon: Home, label: "HOME" },
  { href: "/wardrobe", icon: LayoutGrid, label: "WARDROBE" },
  { href: "/add", icon: Plus, label: "", center: true },
  { href: "/planner", icon: Calendar, label: "PLANNER" },
  { href: "/profile", icon: User, label: "PROFILE" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="flex items-end justify-between px-5 pt-3 pb-4 border-t relative"
      style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)" }}
    >
      {items.map(({ href, icon: Icon, label, center }) => {
        const active = pathname === href;
        if (center) {
          return (
            <Link
              key={href}
              href={href}
              className="btn-chrome rounded-full flex items-center justify-center"
              style={{ width: 52, height: 52, marginTop: -20 }}
            >
              <Icon size={22} />
            </Link>
          );
        }
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-1" style={{ width: 44 }}>
            <Icon size={19} color={active ? "var(--color-accent)" : "var(--color-text-muted)"} />
            <span className="tech-label" style={{ fontSize: 8, color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {label}
            </span>
            {active && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-accent)", boxShadow: "0 0 6px var(--color-accent)" }} />}
          </Link>
        );
      })}
    </div>
  );
}
