import { useState, useEffect } from "react";
import { Section, DisplayMode, ViewToggle, Project } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Console } from "./components/Console";
import { ThreeGLBViewer } from "./viewer/ThreeGLBViewer";
import { SectionHeader, StatRow, Badge, Btn } from "./components/SharedPrimitives";
import { fetchHealth, fetchProjects, createProject } from "./services/api";

import { ProjectWorkspace } from "./pages/ProjectWorkspace";
import { InputWorkspace } from "./pages/InputWorkspace";
import { FrameWorkspace } from "./pages/FrameWorkspace";
import { ReconstructionWorkspace, ReconstructionState } from "./pages/ReconstructionWorkspace";
import { GeorefWorkspace } from "./pages/GeorefWorkspace";
import { ExportWorkspace } from "./pages/ExportWorkspace";

import { ProjectFolderManager } from "./components/ProjectFolderManager";

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>("visualization");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("TEXTURED");
  const [activeToggles, setActiveToggles] = useState<Set<ViewToggle>>(
    new Set(["grid", "axes", "cameras", "flightpath", "bbox"])
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [autoStartTrigger, setAutoStartTrigger] = useState<number>(0);
  const [showFolderHub, setShowFolderHub] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("ascentx_theme") as "dark" | "light") || "dark";
  });

  const [reconstructionState, setReconstructionState] = useState<ReconstructionState>({
    isRunning: false,
    isPaused: false,
    stageName: "",
    stageIndex: 0,
    progress: 0,
    logs: [],
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ascentx_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const refreshProjectList = () => {
    fetchProjects().then((list) => {
      setProjects(list);
      if (list.length > 0 && (!activeProject || !list.find((p) => p.id === activeProject.id))) {
        setActiveProject(list[0]);
      }
    });
  };

  useEffect(() => {
    fetchHealth().then((res) => {
      setApiConnected(res.status === "online");
    });
    refreshProjectList();
  }, []);

  const toggleView = (toggle: ViewToggle) => {
    setActiveToggles((prev) => {
      const next = new Set(prev);
      if (next.has(toggle)) next.delete(toggle);
      else next.add(toggle);
      return next;
    });
  };

  const handleUpdateActiveProject = (updated: Project) => {
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreateNewProject = async () => {
    const defaultName = `scan_session_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
    const newProj = await createProject(defaultName, "Single-Pass Drone Video Survey");
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
    setActiveSection("input");
  };

  const handleStartReconstructionFromQuickControls = () => {
    setActiveSection("reconstruction");
    setAutoStartTrigger(Date.now());
  };

  const renderActiveWorkspace = () => {
    switch (activeSection) {
      case "project":
        return (
          <ProjectWorkspace
            project={activeProject}
            onNavigate={setActiveSection}
            onUpdateProject={handleUpdateActiveProject}
          />
        );
      case "input":
        return (
          <InputWorkspace
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onNavigate={setActiveSection}
          />
        );
      case "frames":
        return <FrameWorkspace project={activeProject} onNavigate={setActiveSection} />;
      case "reconstruction":
        return (
          <ReconstructionWorkspace
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onNavigate={setActiveSection}
            autoStartTrigger={autoStartTrigger}
            onStateChange={setReconstructionState}
          />
        );
      case "georef":
        return <GeorefWorkspace project={activeProject} />;
      case "export":
        return <ExportWorkspace project={activeProject} />;
      case "visualization":
      case "analysis":
      case "measurements":
      case "reports":
      default:
        return (
          <ThreeGLBViewer
            displayMode={displayMode}
            activeToggles={activeToggles}
            activeProject={activeProject}
            theme={theme}
          />
        );
    }
  };

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden transition-colors"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* Header Bar */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        activeToggles={activeToggles}
        toggleView={toggleView}
        theme={theme}
        toggleTheme={toggleTheme}
        onExport={() => setActiveSection("export")}
        onNewProject={handleCreateNewProject}
        onOpenFolderHub={() => setShowFolderHub(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Workflow Pipeline Sidebar */}
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

        {/* Central Dynamic Workspace Panel */}
        <main
          className="flex-1 relative flex flex-col overflow-hidden transition-colors"
          style={{ background: "var(--color-bg)" }}
        >
          {renderActiveWorkspace()}
        </main>

        {/* Right Sidebar Inspector Panel - Synchronized with Active Project */}
        <aside
          className="w-80 border-l flex flex-col flex-shrink-0 overflow-y-auto p-4 gap-4 transition-colors"
          style={{ background: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}
        >
          <div className="rounded-lg p-3 transition-colors" style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label font-semibold" style={{ color: "var(--color-text-muted)" }}>ACTIVE PROJECT METRICS</span>
              <Badge label={apiConnected ? "API ONLINE" : "STANDALONE"} variant={apiConnected ? "ok" : "warn"} />
            </div>
            <StatRow label="Project Name" value={activeProject?.name || "Unassigned"} accent />
            <StatRow label="Project ID" value={activeProject?.id || "N/A"} />
            <StatRow label="Pipeline Status" value={activeProject?.status || "CREATED"} accent />
            <StatRow label="Input Video" value={activeProject?.video_filename || "Not Uploaded"} />
            <StatRow label="Video Resolution" value={activeProject?.video_resolution || "N/A"} />
            <StatRow label="Camera Model" value={activeProject?.camera_model || "N/A"} />
            <StatRow label="Extracted Frames" value={(activeProject?.total_frames || 0).toLocaleString()} />
            <StatRow label="Selected Keys" value={(activeProject?.selected_frames || 0).toLocaleString()} accent={!!activeProject?.selected_frames} />
            <StatRow label="Sparse Points" value={`${(activeProject?.sparse_points || 0).toLocaleString()} pts`} />
            <StatRow label="Dense Cloud" value={activeProject?.dense_points ? `${(activeProject.dense_points / 1000000).toFixed(1)}M pts` : "0 pts"} accent={!!activeProject?.dense_points} />
          </div>

          <div className="rounded-lg p-3 transition-colors" style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)" }}>
            <SectionHeader title="STAGE QUICK CONTROLS" />
            <div className="flex flex-col gap-2 mt-2">
              <Btn label="01 EDIT PROJECT DETAILS" variant="secondary" onClick={() => setActiveSection("project")} />
              <Btn label="02 UPLOAD DRONE VIDEO" variant="primary" onClick={() => setActiveSection("input")} />
              <Btn label="03 RUN FRAME SELECTION" variant="secondary" onClick={() => setActiveSection("frames")} />
              <Btn label="04 START RECONSTRUCTION" variant="primary" onClick={handleStartReconstructionFromQuickControls} />
              <Btn label="06 GEOREFERENCING" variant="ghost" onClick={() => setActiveSection("georef")} />
              <Btn label="07 VIEW 3D CUSTOMIZER" variant="secondary" onClick={() => setActiveSection("visualization")} />
            </div>
          </div>

          <div className="rounded-lg p-3 transition-colors" style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)" }}>
            <SectionHeader title="RECONSTRUCTION CONFIDENCE" />
            <div className="flex flex-col gap-2 mt-2">
              {[
                { label: "HIGH COVERAGE", pct: 74, color: "var(--color-success)" },
                { label: "MEDIUM COVERAGE", pct: 18, color: "var(--color-warning)" },
                { label: "LOW COVERAGE", pct: 5, color: "var(--color-danger)" },
                { label: "INSUFFICIENT", pct: 3, color: "var(--color-text-dim)" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between items-center mb-1" style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                    <span>{c.label}</span>
                    <span style={{ color: c.color }}>{c.pct}%</span>
                  </div>
                  <div className="h-1 rounded" style={{ background: "var(--color-panel-bg)" }}>
                    <div className="h-1 rounded" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Processing Console */}
      <Console activeProject={activeProject} reconstructionState={reconstructionState} />

      {/* Interactive Project Folder Storage Hub Modal */}
      {showFolderHub && (
        <ProjectFolderManager
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(p) => setActiveProject(p)}
          onRefreshProjects={refreshProjectList}
          onClose={() => setShowFolderHub(false)}
          onNavigate={setActiveSection}
        />
      )}
    </div>
  );
}
