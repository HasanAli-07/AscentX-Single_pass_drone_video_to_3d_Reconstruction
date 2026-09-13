import React from "react";

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 py-2 mt-1">
      <span className="stat-label" style={{ color: "#4a4d5a" }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: "#1f2025" }} />
    </div>
  );
}

export function StatRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b" style={{ borderColor: "#1f2025" }}>
      <span style={{ color: "#5a5d6a", fontSize: 11 }}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span style={{ color: accent ? "#00c8d4" : "#e2e4ea", fontSize: 12, fontFamily: "JetBrains Mono, monospace", fontWeight: 500 }}>{value}</span>
        {sub && <span className="stat-label" style={{ color: "#4a4d5a" }}>{sub}</span>}
      </div>
    </div>
  );
}

export function Badge({ label, variant = "neutral" }: { label: string; variant?: "ok" | "warn" | "err" | "neutral" | "running" | "queued" }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    ok:      { bg: "#22c55e18", fg: "#22c55e" },
    warn:    { bg: "#f59e0b18", fg: "#f59e0b" },
    err:     { bg: "#ef444418", fg: "#ef4444" },
    neutral: { bg: "#2a2b3140", fg: "#7a7d8a" },
    running: { bg: "#00c8d418", fg: "#00c8d4" },
    queued:  { bg: "#3d7fff18", fg: "#3d7fff" },
  };
  const c = colors[variant] || colors.neutral;
  return (
    <span className="stat-label px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg, border: `1px solid ${c.fg}30` }}>
      {label}
    </span>
  );
}

export function Btn({ label, onClick, variant = "ghost", full }: { label: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; full?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#00c8d420", color: "#00c8d4", border: "1px solid #00c8d440" },
    secondary: { background: "#3d7fff18", color: "#3d7fff", border: "1px solid #3d7fff40" },
    ghost:     { background: "#1e1f24", color: "#7a7d8a", border: "1px solid #2a2b31" },
    danger:    { background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430" },
  };
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
      style={{ ...styles[variant], fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.05em", width: full ? "100%" : undefined }}
    >
      {label}
    </button>
  );
}

export function SliderRow({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="stat-label" style={{ color: "#6a6d7a" }}>{label}</span>
        <span className="stat-label" style={{ color: "#00c8d4" }}>{value.toFixed(2)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={(max - min) / 100} value={value}
        style={{ "--progress": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}
