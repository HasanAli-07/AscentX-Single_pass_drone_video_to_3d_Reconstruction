import { useState, useEffect } from "react";
import { Project, FrameMetric } from "../types";
import { Badge, Btn } from "../components/SharedPrimitives";
import { runFrameAnalysis } from "../services/api";
import { IconArrowRight } from "../components/Icons";

interface FrameWorkspaceProps {
  project: Project | null;
  onNavigate?: (section: any) => void;
}

export function FrameWorkspace({ project, onNavigate }: FrameWorkspaceProps) {
  const [frames, setFrames] = useState<FrameMetric[]>([]);
  const [reduction, setReduction] = useState<number>(34.6);
  const [loading, setLoading] = useState<boolean>(false);

  const categories = ["SELECTED_KEY", "SELECTED_SUPPORT", "SELECTED_COVERAGE", "REJECTED"];
  const catColors: Record<string, string> = {
    SELECTED_KEY: "#22c55e",
    SELECTED_SUPPORT: "#3d7fff",
    SELECTED_COVERAGE: "#00c8d4",
    REJECTED: "#4a4d5a",
  };

  useEffect(() => {
    loadFrameData();
  }, [project?.id]);

  const loadFrameData = async () => {
    setLoading(true);
    const targetId = project?.id || "PRJ-2026-004A";
    const res = await runFrameAnalysis(targetId);
    setFrames(res.frames);
    setReduction(res.reduction_percentage);
    setLoading(false);
  };

  const selectedCount = frames.filter((f) => f.selection_type !== "REJECTED").length;
  const rejectedCount = frames.filter((f) => f.selection_type === "REJECTED").length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4 font-mono text-xs text-slate-200">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Frames", value: (project?.total_frames || frames.length * 15 || 600).toLocaleString() },
          { label: "Selected Keyframes", value: (project?.selected_frames || selectedCount * 12 || 390).toLocaleString(), accent: true },
          { label: "Rejected Redundant", value: ((project?.total_frames || 600) - (project?.selected_frames || 390)).toLocaleString() },
          { label: "Frame Reduction Rate", value: `${reduction}%` },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded bg-[#18191d] border border-[#2a2b31]">
            <div className="stat-label mb-1 text-slate-400">{s.label}</div>
            <div className={`text-lg font-semibold ${s.accent ? "text-cyan-400" : "text-slate-100"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="rounded-lg p-3 bg-[#18191d] border border-[#2a2b31]">
        <div className="stat-label mb-2 text-slate-400">VIDEO TIMELINE SELECTION MAP</div>
        <div className="flex gap-0.5 h-8">
          {frames.map((f) => (
            <div
              key={f.frame_number}
              title={`Frame #${f.frame_number} · ${f.timestamp_sec}s · ${f.selection_type}`}
              className="flex-1 rounded-sm transition-opacity hover:opacity-80 cursor-pointer"
              style={{ background: catColors[f.selection_type], opacity: f.selection_type === "REJECTED" ? 0.15 : 0.75 }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="stat-label text-slate-500">00:00</span>
          <span className="stat-label text-slate-500">{project?.video_duration_sec ? `${Math.floor(project.video_duration_sec / 60)}m ${Math.floor(project.video_duration_sec % 60)}s` : "00:20"}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: catColors[cat] }} />
              <span className="stat-label text-slate-400">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frame table */}
      <div className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#18191d] border border-[#2a2b31] min-h-[300px]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 py-2 border-b border-[#1f2025] gap-2">
          <span className="stat-label text-slate-400">SINGLE-PASS KEYFRAME QUALITY REPORT</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Btn label={loading ? "ANALYZING..." : "RUN ANALYSIS"} variant="primary" onClick={loadFrameData} />
            {onNavigate && (
              <button
                onClick={() => onNavigate("reconstruction")}
                className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>ACCEPT SELECTION & RECONSTRUCT</span>
                <IconArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full" style={{ fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2025" }}>
                {["#", "TIME", "SHARP", "BRIGHT", "NOVELTY", "SCORE", "STATUS"].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left" style={{ color: "#4a4d5a", fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.06em", fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frames.slice(0, 25).map((f) => (
                <tr key={f.frame_number} style={{ borderBottom: "1px solid #1a1b1f" }} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-3 py-1" style={{ color: "#4a4d5a", fontFamily: "JetBrains Mono,monospace" }}>{f.frame_number}</td>
                  <td className="px-3 py-1" style={{ color: "#6a6d7a", fontFamily: "JetBrains Mono,monospace" }}>{f.timestamp_sec}s</td>
                  <td className="px-3 py-1" style={{ color: "#9a9daa", fontFamily: "JetBrains Mono,monospace" }}>{f.sharpness}</td>
                  <td className="px-3 py-1" style={{ color: "#9a9daa", fontFamily: "JetBrains Mono,monospace" }}>{f.brightness}</td>
                  <td className="px-3 py-1" style={{ color: "#9a9daa", fontFamily: "JetBrains Mono,monospace" }}>{f.novelty_score}</td>
                  <td className="px-3 py-1" style={{ color: f.final_score > 0.7 ? "#22c55e" : "#f59e0b", fontFamily: "JetBrains Mono,monospace" }}>{f.final_score}</td>
                  <td className="px-3 py-1">
                    <Badge
                      label={f.selection_type.replace("SELECTED_", "").replace("SELECTED", "")}
                      variant={f.selection_type === "REJECTED" ? "neutral" : f.selection_type === "SELECTED_KEY" ? "ok" : "running"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
