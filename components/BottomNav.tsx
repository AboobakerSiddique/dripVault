"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Plus, Sparkles, User } from "lucide-react";

const items = [
  { href: "/home", icon: Home },
  { href: "/wardrobe", icon: LayoutGrid },
  { href: "/add", icon: Plus, center: true },
  { href: "/generate", icon: Sparkles },
  { href: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-t"
      style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)" }}
    >
      {items.map(({ href, icon: Icon, center }) => {
        const active = pathname === href;
        if (center) {
          return (
            <Link
              key={href}
              href={href}
              className="btn-chrome rounded-full flex items-center justify-center"
              style={{ width: 46, height: 46 }}
            >
              <Icon size={20} />
            </Link>
          );
        }
        return (
          <Link key={href} href={href} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <Icon size={20} color={active ? "var(--color-accent)" : "var(--color-text-muted)"} />
          </Link>
        );
      })}
    </div>
  );
}
