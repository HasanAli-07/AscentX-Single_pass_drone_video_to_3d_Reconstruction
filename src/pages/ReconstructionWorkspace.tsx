import { Project } from "../types";
import { Badge, Btn } from "../components/SharedPrimitives";

interface ReconstructionWorkspaceProps {
  project: Project | null;
}

export function ReconstructionWorkspace({ project }: ReconstructionWorkspaceProps) {
  const stages = [
    { name: "Frame Processing", status: "COMPLETED", pct: 100, time: "00:18", gpu: 0, output: `${(project?.total_frames || 7860).toLocaleString()} frames decoded` },
    { name: "Camera Calibration", status: "COMPLETED", pct: 100, time: "00:42", gpu: 0, output: `Focal length ${project?.camera_focal_mm || 24}mm` },
    { name: "SfM Sparse Reconstruction", status: "COMPLETED", pct: 100, time: "02:11", gpu: 34, output: `${(project?.sparse_points || 184392).toLocaleString()} sparse pts` },
    { name: "AI Depth Estimation", status: "COMPLETED", pct: 100, time: "01:38", gpu: 92, output: "DepthAnything v2 Neural Engine" },
    { name: "Dense MVS Matching", status: "COMPLETED", pct: 100, time: "03:05", gpu: 87, output: "Multi-View Stereo matching" },
    { name: "Dense Point Cloud", status: "COMPLETED", pct: 100, time: "01:22", gpu: 65, output: `${(project?.dense_points || 4200000).toLocaleString()} dense points` },
    { name: "Mesh Generation", status: project?.status === "COMPLETED" ? "COMPLETED" : "RUNNING", pct: project?.status === "COMPLETED" ? 100 : 72, time: "00:44", gpu: 78, output: "Poisson Surface Reconstruction" },
    { name: "Texture Atlas Generation", status: project?.status === "COMPLETED" ? "COMPLETED" : "QUEUED", pct: project?.status === "COMPLETED" ? 100 : 0, time: "00:20", gpu: 45, output: "4096×4096 UV Map" },
    { name: "Georeferencing Alignment", status: project?.status === "COMPLETED" ? "COMPLETED" : "QUEUED", pct: project?.status === "COMPLETED" ? 100 : 0, time: "00:12", gpu: 10, output: project?.coordinate_system || "WGS84 / UTM Zone 33N" },
  ];

  const statusVariant: Record<string, any> = {
    COMPLETED: "ok",
    RUNNING: "running",
    QUEUED: "queued",
    WARNING: "warn",
    FAILED: "err",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Btn label="START RECONSTRUCTION" variant="primary" />
          <Btn label="PAUSE" variant="ghost" />
          <Btn label="RESUME" variant="ghost" />
          <Btn label="CANCEL" variant="danger" />
        </div>
        <div className="text-slate-400 text-xs font-semibold">
          PROJECT: <span className="text-cyan-400">{project?.name || "scan_session_2024_11_08"}</span> ({project?.id})
        </div>
      </div>

      <div className="rounded-lg overflow-hidden bg-[#18191d] border border-[#2a2b31]">
        <div className="px-3 py-2 border-b border-[#1f2025] flex justify-between items-center">
          <span className="stat-label text-slate-400">SINGLE-PASS RECONSTRUCTION ENGINE PIPELINE</span>
          <Badge label={project?.status || "RUNNING"} variant={project?.status === "COMPLETED" ? "ok" : "running"} />
        </div>
        {stages.map((s, i) => (
          <div key={s.name}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1b1f] last:border-none">
              <div
                className="flex items-center justify-center w-5 h-5 rounded text-xs flex-shrink-0"
                style={{
                  background: s.status === "COMPLETED" ? "#22c55e20" : s.status === "RUNNING" ? "#00c8d420" : "#1e1f24",
                  color: s.status === "COMPLETED" ? "#22c55e" : s.status === "RUNNING" ? "#00c8d4" : "#3a3d4a",
                  fontFamily: "JetBrains Mono,monospace",
                  fontSize: 10,
                  border: "1px solid currentColor",
                }}
              >
                {s.status === "COMPLETED" ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: s.status === "QUEUED" ? "#4a4d5a" : "#d0d4e0", fontSize: 12 }}>{s.name}</span>
                  <Badge label={s.status} variant={statusVariant[s.status]} />
                </div>
                {s.status !== "QUEUED" && (
                  <div className="h-1 rounded bg-[#1e1f24]">
                    <div
                      className="h-1 rounded"
                      style={{ width: `${s.pct}%`, background: s.status === "COMPLETED" ? "#22c55e" : "linear-gradient(90deg,#00c8d4,#3d7fff)" }}
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
                  <div className={`text-[11px] font-mono ${s.gpu > 80 ? "text-amber-400" : "text-slate-400"}`}>{s.gpu ? `${s.gpu}%` : "—"}</div>
                </div>
                <div style={{ width: 160 }}>
                  <div className="stat-label text-slate-500">OUTPUT</div>
                  <div className="text-slate-400 text-[11px]">{s.output}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
