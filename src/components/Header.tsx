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
  onExport: () => void;
  onNewProject: () => void;
}

export function Header({
  projects,
  activeProject,
  onSelectProject,
  displayMode,
  setDisplayMode,
  activeToggles,
  toggleView,
  onExport,
  onNewProject,
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
    <header className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0" style={{ background: "#131418", borderColor: "#2a2b31" }}>
      {/* Left branding & Project Selector */}
      <div className="flex items-center gap-3 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-slate-100 font-extrabold text-sm tracking-widest">
            ASCENTX
          </span>
        </div>
        <div className="h-4 w-px bg-[#2a2b31]" />
        
        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[#18191d] px-2 py-1 rounded border border-[#2a2b31]">
          <span className="text-[10px] text-slate-400 font-semibold">PROJECT:</span>
          <select
            value={activeProject?.id || ""}
            onChange={(e) => {
              const selected = projects.find((p) => p.id === e.target.value);
              if (selected) onSelectProject(selected);
            }}
            className="bg-[#131418] text-cyan-400 text-xs font-semibold px-2 py-0.5 rounded border border-[#2a2b31] outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>
        </div>

        <Badge label={activeProject?.status || "SINGLE-PASS UAV"} variant="ok" />
      </div>

      {/* Middle display modes */}
      <div className="flex items-center gap-1 p-0.5 rounded" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setDisplayMode(m)}
            className="px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
            style={{
              background: displayMode === m ? "#00c8d420" : "transparent",
              color: displayMode === m ? "#00c8d4" : "#5a5d6a",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              border: displayMode === m ? "1px solid #00c8d440" : "1px solid transparent",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* View toggles & export */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {toggles.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleView(t.id)}
              className="px-2 py-1 rounded text-xs transition-colors cursor-pointer"
              style={{
                background: activeToggles.has(t.id) ? "#3d7fff18" : "#18191d",
                color: activeToggles.has(t.id) ? "#3d7fff" : "#4a4d5a",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                border: activeToggles.has(t.id) ? "1px solid #3d7fff30" : "1px solid #2a2b31",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px" style={{ background: "#2a2b31" }} />
        <Btn label="➕ NEW SCAN" variant="ghost" onClick={onNewProject} />
        <Btn label="EXPORT 3D" variant="primary" onClick={onExport} />
      </div>
    </header>
  );
}
