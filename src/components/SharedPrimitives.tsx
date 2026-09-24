import React from "react";

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 py-2 mt-1">
      <span className="stat-label" style={{ color: "var(--color-text-dim)" }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: "var(--color-border-subtle)" }} />
    </div>
  );
}

export function StatRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
      <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span style={{ color: accent ? "var(--color-cyan)" : "var(--color-text)", fontSize: 12, fontFamily: "JetBrains Mono, monospace", fontWeight: 500 }}>{value}</span>
        {sub && <span className="stat-label" style={{ color: "var(--color-text-dim)" }}>{sub}</span>}
      </div>
    </div>
  );
}

export function Badge({ label, variant = "neutral" }: { label: string; variant?: "ok" | "warn" | "err" | "neutral" | "running" | "queued" }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    ok:      { bg: "var(--color-success)", fg: "var(--color-success)" },
    warn:    { bg: "var(--color-warning)", fg: "var(--color-warning)" },
    err:     { bg: "var(--color-danger)", fg: "var(--color-danger)" },
    neutral: { bg: "var(--color-text-muted)", fg: "var(--color-text-muted)" },
    running: { bg: "var(--color-cyan)", fg: "var(--color-cyan)" },
    queued:  { bg: "var(--color-accent)", fg: "var(--color-accent)" },
  };
  const c = colors[variant] || colors.neutral;
  return (
    <span className="stat-label px-1.5 py-0.5 rounded" style={{ background: `color-mix(in sgb, ${c.bg} 15%, transparent)`, color: c.fg, border: `1px solid ${c.fg}40` }}>
      {label}
    </span>
  );
}

export function Btn({ label, onClick, variant = "ghost", full }: { label: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; full?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" },
    secondary: { background: "var(--color-accent-dim)", color: "var(--color-accent)", border: "1px solid var(--color-accent)" },
    ghost:     { background: "var(--color-panel-bg)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" },
    danger:    { background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", border: "1px solid var(--color-danger)" },
  };
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90 active:scale-95 cursor-pointer"
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
        <span className="stat-label" style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <span className="stat-label" style={{ color: "var(--color-cyan)" }}>{value.toFixed(2)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={(max - min) / 100} value={value}
        style={{ "--progress": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full cursor-pointer" />
    </div>
  );
}
