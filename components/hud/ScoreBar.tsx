export default function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 mb-1.5">
      <p className="tech-label" style={{ width: 72, flexShrink: 0 }}>{label}</p>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "var(--color-bg-1)" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: "100%",
            background: "linear-gradient(to right, var(--color-cyan), var(--color-accent))",
            boxShadow: "0 0 6px rgba(157,140,255,0.5)",
          }}
        />
      </div>
      <p className="mono text-[11px]" style={{ width: 24, textAlign: "right", color: "var(--color-text-muted)" }}>{value}</p>
    </div>
  );
}
