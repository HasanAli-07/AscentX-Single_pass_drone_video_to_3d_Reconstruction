import { useState, useEffect, useCallback, useRef } from "react";
import { Project } from "../types";
import { Badge, Btn } from "../components/SharedPrimitives";
import { startReconstructionJob, updateProjectDetails } from "../services/api";
import { IconRefresh, IconPlay, IconPause, IconX, IconTarget, IconSparkles, IconCheck, IconArrowRight } from "../components/Icons";

export interface ReconstructionState {
  isRunning: boolean;
  isPaused: boolean;
  stageName: string;
  stageIndex: number;
  progress: number;
  logs: string[];
}

interface ReconstructionWorkspaceProps {
  project: Project | null;
  onUpdateProject?: (updated: Project) => void;
  onNavigate?: (section: any) => void;
  autoStartTrigger?: number;
  onStateChange?: (state: ReconstructionState) => void;
}

export function ReconstructionWorkspace({
  project,
  onUpdateProject,
  onNavigate,
  autoStartTrigger,
  onStateChange,
}: ReconstructionWorkspaceProps) {
  const isCompleted = project?.status === "COMPLETED";

  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [stageProgress, setStageProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  const stagesDef = [
    { name: "Frame Processing & Decoding", time: "00:18", gpu: 42, defaultOutput: `${(project?.total_frames || 600).toLocaleString()} frames decoded` },
    { name: "Camera Calibration & Intrinsics", time: "00:42", gpu: 30, defaultOutput: `Focal length ${project?.camera_focal_mm || 24}mm` },
    { name: "SfM Sparse Reconstruction", time: "02:11", gpu: 68, defaultOutput: `${(project?.sparse_points || 184392).toLocaleString()} sparse points` },
    { name: "AI Neural Depth Estimation", time: "01:38", gpu: 92, defaultOutput: "DepthAnything v2 Neural Engine" },
    { name: "Dense MVS Surface Matching", time: "03:05", gpu: 87, defaultOutput: "Multi-View Stereo matching" },
    { name: "Dense Point Cloud Generation", time: "01:22", gpu: 65, defaultOutput: `${(project?.dense_points || 4200000).toLocaleString()} dense points` },
    { name: "Poisson Mesh Surface Generation", time: "00:44", gpu: 78, defaultOutput: "High-density surface mesh" },
    { name: "UV Texture Atlas Generation", time: "00:20", gpu: 45, defaultOutput: "4096×4096 UV Map" },
    { name: "Georeferencing Spatial Alignment", time: "00:12", gpu: 10, defaultOutput: project?.coordinate_system || "WGS84 / UTM Zone 33N" },
  ];

  const pushLog = useCallback((msg: string) => {
    const timeStr = new Date().toLocaleTimeString();
    const logLine = `[${timeStr}] ${msg}`;
    setLogs((prev) => [...prev, logLine]);
  }, []);

  const handleStart = useCallback(async () => {
    if (!project) return;
    setCompletedStages(new Set());
    setActiveStageIdx(0);
    setStageProgress(0);
    setIsRunning(true);
    setIsPaused(false);

    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] Starting 3D Reconstruction Pipeline for project ${project.name} (${project.id})...`,
      `[${new Date().toLocaleTimeString()}] Input Video: ${project.video_filename || "Uploaded Drone Flight"} | Resolution: ${project.video_resolution || "4K"}`,
    ];
    setLogs(initialLogs);

    if (onUpdateProject) {
      onUpdateProject({ ...project, status: "RECONSTRUCTING" });
    }

    try {
      await startReconstructionJob(project.id);
    } catch (e) {
      console.warn("Backend job start note:", e);
    }
  }, [project?.id, project?.name, project?.video_filename, project?.video_resolution, onUpdateProject]);

  const lastProcessedTriggerRef = useRef<number>(0);
  const initialSyncedRef = useRef<boolean>(false);

  // Handle auto-start trigger from quick controls (fires ONCE per trigger)
  useEffect(() => {
    if (
      autoStartTrigger &&
      autoStartTrigger > 0 &&
      autoStartTrigger !== lastProcessedTriggerRef.current &&
      !isRunning
    ) {
      lastProcessedTriggerRef.current = autoStartTrigger;
      handleStart();
    }
  }, [autoStartTrigger, handleStart, isRunning]);

  // Initial stage completion sync for already completed projects
  useEffect(() => {
    if (project?.status === "COMPLETED" && !isRunning && !initialSyncedRef.current) {
      initialSyncedRef.current = true;
      setCompletedStages(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
      setActiveStageIdx(8);
      setStageProgress(100);
    }
  }, [project?.status, isRunning]);

  // Notify parent of state changes for Console & Header sync
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isRunning,
        isPaused,
        stageName: stagesDef[activeStageIdx]?.name || "Processing",
        stageIndex: activeStageIdx,
        progress: stageProgress,
        logs,
      });
    }
  }, [isRunning, isPaused, activeStageIdx, stageProgress, logs, onStateChange]);

  // Pipeline simulation step timer
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setStageProgress((prev) => {
        if (prev >= 100) {
          setCompletedStages((c) => {
            const nextSet = new Set(c);
            nextSet.add(activeStageIdx);
            return nextSet;
          });

          if (activeStageIdx < stagesDef.length - 1) {
            const nextIdx = activeStageIdx + 1;
            setActiveStageIdx(nextIdx);

            const stageLogs = [
              `Completed Stage ${activeStageIdx + 1}: ${stagesDef[activeStageIdx].name}`,
              `Starting Stage ${nextIdx + 1}: ${stagesDef[nextIdx].name} (${stagesDef[nextIdx].defaultOutput})`,
            ];
            stageLogs.forEach((l) => pushLog(l));

            return 0;
          } else {
            // All 9 stages complete!
            setIsRunning(false);
            pushLog("3D Reconstruction Pipeline execution finished successfully! 3D Model ready for visualizer.");
            
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
        return prev + 25;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, activeStageIdx, project?.id, onUpdateProject, pushLog]);

  const handlePause = () => {
    setIsPaused(true);
    pushLog(`Paused reconstruction pipeline at Stage ${activeStageIdx + 1} (${stagesDef[activeStageIdx].name})`);
  };
  const handleResume = () => {
    setIsPaused(false);
    pushLog(`Resumed reconstruction pipeline execution`);
  };
  const handleCancel = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCompletedStages(new Set());
    setStageProgress(0);
    pushLog(`Cancelled reconstruction pipeline execution`);
    if (project && onUpdateProject) {
      onUpdateProject({ ...project, status: "VALIDATED" });
    }
  };

  const isAllDone = completedStages.size === stagesDef.length || isCompleted;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs text-slate-200">
      {/* Header controls & Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-[#18191d] p-3 rounded-lg border border-[#2a2b31] gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning && (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              {isAllDone ? <IconRefresh size={14} /> : <IconPlay size={14} />}
              <span>{isAllDone ? "RE-RUN RECONSTRUCTION PIPELINE" : "START RECONSTRUCTION PIPELINE"}</span>
            </button>
          )}
          {isRunning && !isPaused && (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <IconPause size={12} />
              <span>PAUSE</span>
            </button>
          )}
          {isRunning && isPaused && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <IconPlay size={12} />
              <span>RESUME</span>
            </button>
          )}
          {isRunning && (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <IconX size={12} />
              <span>CANCEL</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
          <div className="text-slate-400 text-xs font-semibold truncate">
            PROJECT: <span className="text-cyan-400">{project?.name || "scan_session"}</span> ({project?.id || "N/A"})
          </div>
          {isAllDone && onNavigate && (
            <button
              onClick={() => onNavigate("visualization")}
              className="px-4 py-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5 animate-pulse shadow-md"
            >
              <IconTarget size={14} />
              <span>VIEW RECONSTRUCTED 3D MODEL</span>
              <IconArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {isAllDone && !isRunning && (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <IconSparkles size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-bold">3D RECONSTRUCTION COMPLETE!</span>
            <span className="hidden md:inline text-slate-300 text-xs">| Sparse Cloud: 184,392 pts | Dense Mesh: 4,200,000 pts</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("visualization")}
              className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 cursor-pointer flex items-center gap-1.5"
            >
              <span>OPEN 3D VISUALIZER</span>
              <IconArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Reconstruction Pipeline Stage Cards */}
      <div className="rounded-lg overflow-hidden bg-[#18191d] border border-[#2a2b31]">
        <div className="px-3 py-2 border-b border-[#1f2025] flex justify-between items-center bg-[#131418] flex-wrap gap-2">
          <span className="stat-label text-slate-400 font-semibold">SINGLE-PASS RECONSTRUCTION STAGE EXECUTION</span>
          <Badge
            label={isRunning ? (isPaused ? "PAUSED" : `RUNNING - STAGE ${activeStageIdx + 1}/9`) : isAllDone ? "COMPLETED" : "READY TO START"}
            variant={isRunning ? "running" : isAllDone ? "ok" : "neutral"}
          />
        </div>

        {stagesDef.map((s, i) => {
          const isDone = completedStages.has(i) || (isAllDone && !isRunning);
          const isCurrent = isRunning && activeStageIdx === i;
          const isQueued = !isDone && !isCurrent;
          const currentPct = isDone ? 100 : isCurrent ? stageProgress : 0;

          return (
            <div key={s.name} className="flex flex-col md:flex-row items-start md:items-center gap-3 px-4 py-3 border-b border-[#1a1b1f] last:border-none">
              <div className="flex items-center gap-3 w-full md:w-auto">
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
                  {isDone ? <IconCheck size={10} /> : i + 1}
                </div>

                <div className="flex-1 md:hidden flex justify-between items-center">
                  <span className={`text-xs ${isQueued ? "text-slate-500" : isDone ? "text-slate-200" : "text-cyan-400 font-bold"}`}>
                    {s.name}
                  </span>
                  <Badge
                    label={isDone ? "OK" : isCurrent ? "RUN" : "QUEUE"}
                    variant={isDone ? "ok" : isCurrent ? "running" : "queued"}
                  />
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="hidden md:flex items-center gap-2 mb-1">
                  <span className={`text-xs ${isQueued ? "text-slate-500" : isDone ? "text-slate-200" : "text-cyan-400 font-bold"}`}>
                    {s.name}
                  </span>
                  <Badge
                    label={isDone ? "COMPLETED" : isCurrent ? "RUNNING" : "QUEUED"}
                    variant={isDone ? "ok" : isCurrent ? "running" : "queued"}
                  />
                </div>
                {!isQueued && (
                  <div className="h-1.5 rounded bg-[#1e1f24] overflow-hidden w-full">
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

              <div className="flex items-center justify-between md:justify-end gap-4 text-right flex-shrink-0 w-full md:w-auto text-[11px]">
                <div>
                  <div className="stat-label text-slate-500 text-[9px]">TIME</div>
                  <div className="text-slate-400 font-mono">{s.time}</div>
                </div>
                <div>
                  <div className="stat-label text-slate-500 text-[9px]">GPU</div>
                  <div className={`font-mono ${s.gpu > 80 ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                    {isCurrent ? `${s.gpu}%` : isDone ? `${Math.round(s.gpu * 0.4)}%` : "—"}
                  </div>
                </div>
                <div className="md:w-44 text-right">
                  <div className="stat-label text-slate-500 text-[9px]">OUTPUT</div>
                  <div className="text-slate-400 truncate max-w-[140px] md:max-w-[180px]">{s.defaultOutput}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

