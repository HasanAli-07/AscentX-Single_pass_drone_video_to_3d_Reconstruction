import { useState, useEffect, useRef } from "react";
import { Badge } from "./SharedPrimitives";
import { Project } from "../types";

interface ConsoleProps {
  activeProject: Project | null;
  reconstructionState?: {
    isRunning: boolean;
    isPaused: boolean;
    stageName: string;
    stageIndex: number;
    progress: number;
    logs: string[];
  };
}

export function Console({ activeProject, reconstructionState }: ConsoleProps) {
  const [expanded, setExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const defaultLogs = [
    `[${new Date().toLocaleTimeString()}] Project initialized: ${activeProject?.name || "scan_session"} (${activeProject?.id || "N/A"})`,
    activeProject?.video_filename
      ? `[${new Date().toLocaleTimeString()}] Video loaded: ${activeProject.video_filename} (${activeProject.video_resolution || "4K"}, ${activeProject.total_frames || 600} frames)`
      : `[${new Date().toLocaleTimeString()}] Awaiting video upload for 3D reconstruction pipeline`,
    activeProject?.status === "COMPLETED"
      ? `[${new Date().toLocaleTimeString()}] 3D Reconstruction status: COMPLETED (184,392 sparse pts, 4.2M dense mesh pts)`
      : `[${new Date().toLocaleTimeString()}] System ready for reconstruction execution`,
  ];

  const displayLogs = reconstructionState?.logs && reconstructionState.logs.length > 0
    ? reconstructionState.logs
    : defaultLogs;

  useEffect(() => {
    if (expanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayLogs, expanded]);

  const renderBadge = () => {
    if (reconstructionState?.isRunning) {
      return (
        <Badge
          label={`STAGE ${reconstructionState.stageIndex + 1}/9 ● ${reconstructionState.stageName.toUpperCase()} (${reconstructionState.progress}%)`}
          variant="running"
        />
      );
    }
    if (activeProject?.status === "COMPLETED") {
      return <Badge label="RECONSTRUCTION COMPLETED ● 100%" variant="ok" />;
    }
    if (activeProject?.video_filename) {
      return <Badge label="INPUT READY ● VIDEO LOADED" variant="neutral" />;
    }
    return <Badge label="PIPELINE IDLE" variant="neutral" />;
  };

  const statusSubtext = () => {
    if (reconstructionState?.isRunning) {
      return reconstructionState.stageName;
    }
    if (activeProject?.status === "COMPLETED") {
      return `${activeProject.sparse_points || 184392} sparse points | ${(activeProject.dense_points ? activeProject.dense_points / 1000000 : 4.2).toFixed(1)}M dense cloud`;
    }
    if (activeProject?.video_filename) {
      return `Loaded: ${activeProject.video_filename}`;
    }
    return "Ready to process single-pass drone video";
  };

  return (
    <footer
      className="border-t flex flex-col transition-all flex-shrink-0"
      style={{ background: "#131418", borderColor: "#2a2b31", height: expanded ? 180 : 36 }}
    >
      {/* Console top bar */}
      <div className="h-9 px-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-3">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>PROCESSING CONSOLE</span>
          {renderBadge()}
          <span style={{ color: "#5a5d6a", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} className="truncate max-w-md">
            {statusSubtext()}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="stat-label" style={{ color: "#3a3d4a" }}>GPU</span>
            <span style={{ color: reconstructionState?.isRunning ? "#22c55e" : "#00c8d4", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
              {reconstructionState?.isRunning ? "78%" : "12%"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="stat-label" style={{ color: "#3a3d4a" }}>VRAM</span>
            <span style={{ color: "#00c8d4", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
              {reconstructionState?.isRunning ? "4.2 GB / 8.0 GB" : "1.1 GB / 8.0 GB"}
            </span>
          </div>
          <span className="stat-label" style={{ color: expanded ? "#00c8d4" : "#4a4d5a" }}>
            {expanded ? "▼ COLLAPSE" : `▲ LOGS (${displayLogs.length})`}
          </span>
        </div>
      </div>

      {/* Expanded terminal log output */}
      {expanded && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs border-t flex flex-col" style={{ background: "#0d0e11", borderColor: "#1f2025" }}>
          {displayLogs.map((log, idx) => (
            <div key={idx} className="py-0.5" style={{ color: "#7a7d8a", fontSize: 11 }}>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </footer>
  );
}

