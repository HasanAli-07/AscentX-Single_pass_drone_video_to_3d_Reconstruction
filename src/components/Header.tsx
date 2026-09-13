import { Btn, Badge } from "./SharedPrimitives";
import { DisplayMode, ViewToggle } from "../types";

interface HeaderProps {
  projectName: string;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  activeToggles: Set<ViewToggle>;
  toggleView: (t: ViewToggle) => void;
  onExport: () => void;
  onNewProject: () => void;
}

export function Header({
  projectName,
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
      {/* Left branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#00c8d4" }} />
          <span style={{ color: "#e2e4ea", fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em" }}>
            ASCENTX
          </span>
        </div>
        <div className="h-4 w-px" style={{ background: "#2a2b31" }} />
        <span style={{ color: "#7a7d8a", fontSize: 12 }}>{projectName}</span>
        <Badge label="SINGLE-PASS UAV" variant="ok" />
      </div>

      {/* Middle display modes */}
      <div className="flex items-center gap-1 p-0.5 rounded" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setDisplayMode(m)}
            className="px-2.5 py-1 rounded text-xs transition-colors"
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
              className="px-2 py-1 rounded text-xs transition-colors"
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
        <Btn label="NEW SCAN" variant="ghost" onClick={onNewProject} />
        <Btn label="EXPORT 3D" variant="primary" onClick={onExport} />
      </div>
    </header>
  );
}
