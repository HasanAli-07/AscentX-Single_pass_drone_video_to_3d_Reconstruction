import { useState, useEffect } from "react";
import { Section, DisplayMode, ViewToggle, Project } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Console } from "./components/Console";
import { MeshViewport } from "./viewer/MeshViewport";
import { SectionHeader, StatRow, Badge, Btn } from "./components/SharedPrimitives";
import { fetchHealth, fetchProjects } from "./services/api";

import { ProjectWorkspace } from "./pages/ProjectWorkspace";
import { InputWorkspace } from "./pages/InputWorkspace";
import { FrameWorkspace } from "./pages/FrameWorkspace";
import { ReconstructionWorkspace } from "./pages/ReconstructionWorkspace";
import { GeorefWorkspace } from "./pages/GeorefWorkspace";
import { ExportWorkspace } from "./pages/ExportWorkspace";

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>("project");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("TEXTURED");
  const [activeToggles, setActiveToggles] = useState<Set<ViewToggle>>(
    new Set(["grid", "axes", "cameras", "flightpath", "bbox"])
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  useEffect(() => {
    fetchHealth().then((res) => {
      setApiConnected(res.status === "online");
    });
    fetchProjects().then((list) => {
      setProjects(list);
      if (list.length > 0) setActiveProject(list[0]);
    });
  }, []);

  const toggleView = (toggle: ViewToggle) => {
    setActiveToggles((prev) => {
      const next = new Set(prev);
      if (next.has(toggle)) next.delete(toggle);
      else next.add(toggle);
      return next;
    });
  };

  const renderActiveWorkspace = () => {
    switch (activeSection) {
      case "project":
        return <ProjectWorkspace project={activeProject} onNavigate={setActiveSection} />;
      case "input":
        return <InputWorkspace />;
      case "frames":
        return <FrameWorkspace />;
      case "reconstruction":
        return <ReconstructionWorkspace />;
      case "georef":
        return <GeorefWorkspace />;
      case "export":
        return <ExportWorkspace />;
      case "visualization":
      case "analysis":
      case "measurements":
      case "reports":
      default:
        return <MeshViewport displayMode={displayMode} activeToggles={activeToggles} />;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden text-slate-200" style={{ background: "#0d0e11" }}>
      {/* Header Bar */}
      <Header
        projectName={activeProject?.name || "scan_session_2024_11_08"}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        activeToggles={activeToggles}
        toggleView={toggleView}
        onExport={() => setActiveSection("export")}
        onNewProject={() => setActiveSection("input")}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Workflow Pipeline Sidebar */}
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

        {/* Central Dynamic Workspace Panel */}
        <main className="flex-1 relative flex flex-col overflow-hidden bg-[#0d0e11]">
          {renderActiveWorkspace()}
        </main>

        {/* Right Sidebar Inspector Panel */}
        <aside className="w-80 border-l flex flex-col flex-shrink-0 overflow-y-auto p-4 gap-4" style={{ background: "#131418", borderColor: "#2a2b31" }}>
          <div className="rounded-lg p-3" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label" style={{ color: "#4a4d5a" }}>PROJECT METRIC SUMMARY</span>
              <Badge label={apiConnected ? "API ONLINE" : "STANDALONE"} variant={apiConnected ? "ok" : "warn"} />
            </div>
            <StatRow label="Project ID" value={activeProject?.id || "PRJ-20241108-004A"} />
            <StatRow label="Single-Pass Flight" value="COMPLETED" accent />
            <StatRow label="Sample Rate" value="15.8% (229 / 350)" />
            <StatRow label="Camera Model" value="DJI FC3411 (24mm)" />
            <StatRow label="Sparse Points" value="184,392 pts" />
            <StatRow label="Dense Cloud" value="4.2M pts" accent />
          </div>

          <div className="rounded-lg p-3" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
            <SectionHeader title="STAGE CONTROLS" />
            <div className="flex flex-col gap-2 mt-2">
              <Btn label="RE-RUN FRAME INTELLIGENCE" variant="secondary" onClick={() => setActiveSection("frames")} />
              <Btn label="START SfM & MVS" variant="primary" onClick={() => setActiveSection("reconstruction")} />
              <Btn label="APPLY GEOREFERENCING" variant="ghost" onClick={() => setActiveSection("georef")} />
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
            <SectionHeader title="RECONSTRUCTION CONFIDENCE" />
            <div className="flex flex-col gap-2 mt-2">
              {[
                { label: "HIGH COVERAGE", pct: 74, color: "#22c55e" },
                { label: "MEDIUM COVERAGE", pct: 18, color: "#f59e0b" },
                { label: "LOW COVERAGE", pct: 5, color: "#ef4444" },
                { label: "INSUFFICIENT", pct: 3, color: "#7a3d7a" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between items-center mb-1" style={{ fontSize: 10, color: "#6a6d7a", fontFamily: "JetBrains Mono, monospace" }}>
                    <span>{c.label}</span>
                    <span style={{ color: c.color }}>{c.pct}%</span>
                  </div>
                  <div className="h-1 rounded" style={{ background: "#1e1f24" }}>
                    <div className="h-1 rounded" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Processing Console */}
      <Console />
    </div>
  );
}
