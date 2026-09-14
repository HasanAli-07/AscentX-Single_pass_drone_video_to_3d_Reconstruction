import { useState, useEffect } from "react";
import { Project } from "../types";
import { Badge, Btn } from "../components/SharedPrimitives";
import { startReconstructionJob, updateProjectDetails } from "../services/api";

interface ReconstructionWorkspaceProps {
  project: Project | null;
  onUpdateProject?: (updated: Project) => void;
  onNavigate?: (section: any) => void;
}

export function ReconstructionWorkspace({ project, onUpdateProject, onNavigate }: ReconstructionWorkspaceProps) {
  const isInitiallyCompleted = project?.status === "COMPLETED";

  const [activeStageIdx, setActiveStageIdx] = useState<number>(isInitiallyCompleted ? 8 : 0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completedStages, setCompletedStages] = useState<Set<number>>(
    isInitiallyCompleted ? new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]) : new Set()
  );
  const [stageProgress, setStageProgress] = useState<number>(isInitiallyCompleted ? 100 : 0);

  const stagesDef = [
    { name: "Frame Processing & Decoding", time: "00:18", gpu: 0, defaultOutput: `${(project?.total_frames || 600).toLocaleString()} frames decoded` },
    { name: "Camera Calibration & Intrinsics", time: "00:42", gpu: 0, defaultOutput: `Focal length ${project?.camera_focal_mm || 24}mm` },
    { name: "SfM Sparse Reconstruction", time: "02:11", gpu: 34, defaultOutput: `${(project?.sparse_points || 184392).toLocaleString()} sparse points` },
    { name: "AI Neural Depth Estimation", time: "01:38", gpu: 92, defaultOutput: "DepthAnything v2 Neural Engine" },
    { name: "Dense MVS Surface Matching", time: "03:05", gpu: 87, defaultOutput: "Multi-View Stereo matching" },
    { name: "Dense Point Cloud Generation", time: "01:22", gpu: 65, defaultOutput: `${(project?.dense_points || 4200000).toLocaleString()} dense points` },
    { name: "Poisson Mesh Surface Generation", time: "00:44", gpu: 78, defaultOutput: "High-density surface mesh" },
    { name: "UV Texture Atlas Generation", time: "00:20", gpu: 45, defaultOutput: "4096×4096 UV Map" },
    { name: "Georeferencing Spatial Alignment", time: "00:12", gpu: 10, defaultOutput: project?.coordinate_system || "WGS84 / UTM Zone 33N" },
  ];

  // Simulation timer for realistic 3D reconstruction progression
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setStageProgress((prev) => {
        if (prev >= 100) {
          setCompletedStages((c) => new Set(c).add(activeStageIdx));
          if (activeStageIdx < stagesDef.length - 1) {
            setActiveStageIdx((idx) => idx + 1);
            return 0;
          } else {
            // Pipeline Completed
            setIsRunning(false);
            if (project) {
              const updated: Project = {
                ...project,
                status: "COMPLETED",
                sparse_points: project.sparse_points || 184392,
                dense_points: project.dense_points || 4200000,
              };
              if (onUpdateProject) onUpdateProject(updated);
              updateProjectDetails(project.id, updated);
            }
            return 100;
          }
        }
        return prev + 15;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, activeStageIdx, project]);

  const handleStart = async () => {
    if (!project) return;
    setIsRunning(true);
    setIsPaused(false);
    setActiveStageIdx(0);
    setCompletedStages(new Set());
    setStageProgress(0);

    await startReconstructionJob(project.id);
  };

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);
  const handleCancel = () => {
    setIsRunning(false);
    setIsPaused(false);
    setStageProgress(0);
  };

  const isFinished = completedStages.size === stagesDef.length;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isRunning && !isFinished && (
            <Btn label="START RECONSTRUCTION" variant="primary" onClick={handleStart} />
          )}
          {isRunning && !isPaused && (
            <Btn label="PAUSE" variant="ghost" onClick={handlePause} />
          )}
          {isRunning && isPaused && (
            <Btn label="RESUME" variant="primary" onClick={handleResume} />
          )}
          {isRunning && (
            <Btn label="CANCEL" variant="danger" onClick={handleCancel} />
          )}
          {isFinished && (
            <Btn label="RE-RUN RECONSTRUCTION" variant="secondary" onClick={handleStart} />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-slate-400 text-xs font-semibold">
            PROJECT: <span className="text-cyan-400">{project?.name || "scan_session_2024_11_08"}</span> ({project?.id})
          </div>
          {isFinished && onNavigate && (
            <button
              onClick={() => onNavigate("visualization")}
              className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              🎯 VIEW RECONSTRUCTED 3D MODEL ➔
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden bg-[#18191d] border border-[#2a2b31]">
        <div className="px-3 py-2 border-b border-[#1f2025] flex justify-between items-center">
          <span className="stat-label text-slate-400 font-semibold">SINGLE-PASS RECONSTRUCTION ENGINE PIPELINE</span>
          <Badge
            label={isFinished ? "COMPLETED" : isRunning ? (isPaused ? "PAUSED" : "RUNNING") : "READY TO START"}
            variant={isFinished ? "ok" : isRunning ? "running" : "neutral"}
          />
        </div>

        {stagesDef.map((s, i) => {
          const isDone = completedStages.has(i);
          const isCurrent = isRunning && activeStageIdx === i;
          const isQueued = !isDone && !isCurrent;
          const currentPct = isDone ? 100 : isCurrent ? stageProgress : 0;

          return (
            <div key={s.name} className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1b1f] last:border-none">
              <div
                className="flex items-center justify-center w-5 h-5 rounded text-xs flex-shrink-0 font-bold"
                style={{
                  background: isDone ? "#22c55e20" : isCurrent ? "#00c8d420" : "#1e1f24",
                  color: isDone ? "#22c55e" : isCurrent ? "#00c8d4" : "#3a3d4a",
                  fontFamily: "JetBrains Mono,monospace",
                  fontSize: 10,
                  border: "1px solid currentColor",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs ${isQueued ? "text-slate-500" : isDone ? "text-slate-200" : "text-cyan-400 font-bold"}`}>
                    {s.name}
                  </span>
                  <Badge
                    label={isDone ? "COMPLETED" : isCurrent ? "RUNNING" : "QUEUED"}
                    variant={isDone ? "ok" : isCurrent ? "running" : "queued"}
                  />
                </div>
                {!isQueued && (
                  <div className="h-1.5 rounded bg-[#1e1f24] overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${currentPct}%`,
                        background: isDone ? "#22c55e" : "linear-gradient(90deg,#00c8d4,#3d7fff)",
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-right flex-shrink-0">
                <div>
                  <div className="stat-label text-slate-500">TIME</div>
                  <div className="text-slate-400 text-[11px] font-mono">{s.time}</div>
                </div>
                <div>
                  <div className="stat-label text-slate-500">GPU</div>
                  <div className={`text-[11px] font-mono ${s.gpu > 80 ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                    {isCurrent ? `${s.gpu}%` : isDone ? `${Math.round(s.gpu * 0.4)}%` : "—"}
                  </div>
                </div>
                <div style={{ width: 180 }}>
                  <div className="stat-label text-slate-500">OUTPUT</div>
                  <div className="text-slate-400 text-[11px] truncate">{s.defaultOutput}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
