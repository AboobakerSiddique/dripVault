import { ReactNode } from "react";

const bracketStyle = {
  position: "absolute" as const,
  width: 10,
  height: 10,
  borderColor: "var(--color-accent)",
  opacity: 0.7,
};

export default function HUDPanel({
  children,
  className = "",
  brackets = true,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  brackets?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={`hud-panel ${className}`}
      style={glow ? { boxShadow: "0 0 24px rgba(157,140,255,0.08)" } : undefined}
    >
      {brackets && (
        <>
          <span style={{ ...bracketStyle, top: -1, left: -1, borderTop: "1.5px solid", borderLeft: "1.5px solid" }} />
          <span style={{ ...bracketStyle, top: -1, right: -1, borderTop: "1.5px solid", borderRight: "1.5px solid" }} />
          <span style={{ ...bracketStyle, bottom: -1, left: -1, borderBottom: "1.5px solid", borderLeft: "1.5px solid" }} />
          <span style={{ ...bracketStyle, bottom: -1, right: -1, borderBottom: "1.5px solid", borderRight: "1.5px solid" }} />
        </>
      )}
      {children}
    </div>
  );
}
