"use client";

import { useEffect, useState } from "react";
import Chip from "@/components/Chip";

const AESTHETICS = ["minimal", "streetwear", "smart casual", "old money", "vintage", "y2k", "monochrome", "formal", "athletic", "korean", "gym"];
const FITS = ["slim", "regular", "relaxed", "oversized"];

export default function Preferences() {
  const [styles, setStyles] = useState<string[]>([]);
  const [fits, setFits] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        setStyles(data.preferences?.preferred_styles ?? []);
        setFits(data.preferences?.preferred_fits ?? []);
      });
  }, []);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setSaved(false);
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const save = async () => {
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_styles: styles, preferred_fits: fits }),
    });
    setSaved(true);
  };

  return (
    <div className="mb-6">
      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>FAVORITE AESTHETICS</p>
      <div className="flex flex-wrap mb-4">
        {AESTHETICS.map((a) => (
          <Chip key={a} label={a} active={styles.includes(a)} onClick={() => toggle(styles, setStyles, a)} />
        ))}
      </div>

      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>PREFERRED FITS</p>
      <div className="flex flex-wrap mb-4">
        {FITS.map((f) => (
          <Chip key={f} label={f} active={fits.includes(f)} onClick={() => toggle(fits, setFits, f)} />
        ))}
      </div>

      <button onClick={save} className="btn-outline w-full py-2.5 text-xs">
        {saved ? "SAVED" : "SAVE PREFERENCES"}
      </button>
    </div>
  );
}
