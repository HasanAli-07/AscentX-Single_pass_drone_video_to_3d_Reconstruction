import { Project, DisplayMode, ViewToggle } from "../types";
import { Btn, Badge } from "./SharedPrimitives";

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  activeToggles: Set<ViewToggle>;
  toggleView: (t: ViewToggle) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onExport: () => void;
  onNewProject: () => void;
  onOpenFolderHub: () => void;
}

export function Header({
  projects,
  activeProject,
  onSelectProject,
  displayMode,
  setDisplayMode,
  activeToggles,
  toggleView,
  theme,
  toggleTheme,
  onExport,
  onNewProject,
  onOpenFolderHub,
}: HeaderProps) {
  const modes: DisplayMode[] = ["TEXTURED", "SOLID", "WIRE", "POINT CLOUD", "CONFIDENCE"];
  const toggles: { id: ViewToggle; label: string }[] = [
    { id: "grid", label: "GRID" },
    { id: "axes", label: "AXES" },
    { id: "cameras", label: "CAMERAS" },
    { id: "flightpath", label: "FLIGHT PATH" },
    { id: "bbox", label: "BBOX" },
    { id: "measurements", label: "MEASURES" },
  ];

  return (
    <header className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0 transition-colors" style={{ background: "var(--color-header-bg)", borderColor: "var(--color-border)" }}>
      {/* Left branding & Project Selector */}
      <div className="flex items-center gap-3 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="font-extrabold text-sm tracking-widest" style={{ color: "var(--color-text)" }}>
            ASCENTX
          </span>
        </div>
        <div className="h-4 w-px" style={{ background: "var(--color-border)" }} />
        
        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-2 px-2 py-1 rounded border" style={{ background: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
          <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>PROJECT:</span>
          <select
            value={activeProject?.id || ""}
            onChange={(e) => {
              const selected = projects.find((p) => p.id === e.target.value);
              if (selected) onSelectProject(selected);
            }}
            className="text-xs font-semibold px-2 py-0.5 rounded border outline-none cursor-pointer"
            style={{ background: "var(--color-input-bg)", color: "var(--color-cyan)", borderColor: "var(--color-border)" }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>
          <button
            onClick={onOpenFolderHub}
            className="px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
            style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
          >
            <span>📂</span> FOLDERS
          </button>
        </div>

        <Badge label={activeProject?.status || "SINGLE-PASS UAV"} variant="ok" />
      </div>

      {/* Middle display modes */}
      <div className="flex items-center gap-1 p-0.5 rounded" style={{ background: "var(--color-panel-bg)", border: "1px solid var(--color-border)" }}>
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setDisplayMode(m)}
            className="px-2.5 py-1 rounded text-xs transition-all cursor-pointer"
            style={{
              background: displayMode === m ? "var(--color-cyan-dim)" : "transparent",
              color: displayMode === m ? "var(--color-cyan)" : "var(--color-text-muted)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              border: displayMode === m ? "1px solid var(--color-cyan)" : "1px solid transparent",
              fontWeight: displayMode === m ? 600 : 400,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* View toggles, Theme Switcher & export */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {toggles.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleView(t.id)}
              className="px-2 py-1 rounded text-xs transition-colors cursor-pointer"
              style={{
                background: activeToggles.has(t.id) ? "var(--color-accent-dim)" : "var(--color-panel-bg)",
                color: activeToggles.has(t.id) ? "var(--color-accent)" : "var(--color-text-dim)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                border: activeToggles.has(t.id) ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px" style={{ background: "var(--color-border)" }} />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          style={{
            background: "var(--color-panel-bg)",
            color: theme === "light" ? "#d97706" : "#f59e0b",
            border: "1px solid var(--color-border)",
          }}
        >
          <span>{theme === "dark" ? "☀️ LIGHT" : "🌙 DARK"}</span>
        </button>

        <div className="h-4 w-px" style={{ background: "var(--color-border)" }} />
        <Btn label="➕ NEW SCAN" variant="ghost" onClick={onNewProject} />
        <Btn label="EXPORT 3D" variant="primary" onClick={onExport} />
      </div>
    </header>
  );
}
