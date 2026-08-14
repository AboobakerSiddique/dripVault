"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { History, Menu, X } from "lucide-react";

const MENU_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/generate", label: "Generate" },
  { href: "/outfits", label: "Saved Outfits" },
  { href: "/history", label: "Outfit History" },
  { href: "/planner", label: "Planner" },
  { href: "/profile", label: "Profile" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-4 border-b relative"
        style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)" }}
      >
        <button onClick={() => setMenuOpen(true)} aria-label="Menu">
          <Menu size={20} color="var(--color-text-muted)" />
        </button>
        <Image
          src="/logo.png"
          alt="dripVault"
          width={528}
          height={284}
          priority
          className="h-14 w-auto max-w-[62%]"
          style={{ filter: "drop-shadow(0 0 20px rgba(157,140,255,0.5))" }}
        />
        <Link href="/history" aria-label="Outfit history" className="relative">
          <History size={19} color="var(--color-accent)" style={{ filter: "drop-shadow(0 0 4px rgba(157,140,255,0.6))" }} />
        </Link>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(6,6,10,0.85)" }} onClick={() => setMenuOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-72 max-w-[80vw] p-6 border-r hud-grid-bg"
            style={{ background: "var(--color-bg-0)", borderColor: "var(--color-border)" }}
          >
            <div className="flex justify-between items-center mb-8">
              <p className="tech-label">[ NAVIGATION ]</p>
              <button onClick={() => setMenuOpen(false)}><X size={18} color="var(--color-text-muted)" /></button>
            </div>
            <div className="flex flex-col gap-1">
              {MENU_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 px-3 rounded-md text-sm border-b"
                  style={{ borderColor: "var(--color-border)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
