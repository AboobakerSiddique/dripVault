export default function StatusIndicator({ label = "SYSTEM ONLINE", color = "var(--color-cyan)" }: { label?: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 tech-label">
      <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span>[ {label} ]</span>
    </div>
  );
}
