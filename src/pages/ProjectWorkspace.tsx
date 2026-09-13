import { useState } from "react";
import { Project } from "../types";
import { StatRow, Badge, Btn } from "../components/SharedPrimitives";

interface ProjectWorkspaceProps {
  project: Project | null;
  onNavigate: (section: any) => void;
}

export function ProjectWorkspace({ project, onNavigate }: ProjectWorkspaceProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Project card */}
        <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span style={{ color: "#e2e4ea", fontSize: 14, fontWeight: 600 }}>{project?.name || "scan_session_2024_11_08"}</span>
                <Badge label={project?.status || "ACTIVE"} variant="running" />
              </div>
              <span className="stat-label" style={{ color: "#4a4d5a" }}>
                {project?.id || "PRJ-20241108-004A"} · Created {project?.created_at || "Nov 8 2024 09:31 UTC"}
              </span>
            </div>
            <div className="flex gap-1.5">
              <Btn label="RENAME" variant="ghost" />
              <Btn label="SETTINGS" variant="secondary" onClick={() => setShowSettings((s) => !s)} />
            </div>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {[
              { label: "Last Processed", value: "09:42:24 UTC" },
              { label: "Input Video", value: project?.video_filename || "DJI_0042.MP4" },
              { label: "Duration", value: "4m 22s" },
              { label: "GPS", value: project?.has_gps ? "Available" : "Missing", ok: project?.has_gps },
              { label: "IMU / RTK", value: project?.has_imu ? "RTK Active" : "Standard", ok: project?.has_imu },
              { label: "Camera Cal.", value: project?.has_calibration ? "Pre-calibrated" : "Default", ok: project?.has_calibration },
            ].map((row) => (
              <div key={row.label} className="p-2 rounded" style={{ background: "#13141820", border: "1px solid #1f2025" }}>
                <div className="stat-label mb-0.5" style={{ color: "#4a4d5a" }}>{row.label}</div>
                <div style={{ color: row.ok ? "#22c55e" : "#9a9daa", fontSize: 11, fontFamily: "JetBrains Mono,monospace" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline summary */}
        <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
          <div className="stat-label mb-3" style={{ color: "#4a4d5a" }}>PIPELINE SUMMARY</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {[
              { group: "INPUT", items: ["Single-pass drone video", "GPS / Flight Metadata", "Camera Parameters"], color: "#3d7fff" },
              { group: "PROCESSING", items: ["Frame Selection", "AI Depth", "SfM / MVS", "Georeferencing"], color: "#00c8d4" },
              { group: "OUTPUT", items: ["3D Mesh Model", "Point Cloud", "Measurements"], color: "#22c55e" },
            ].map((col) => (
              <div key={col.group} className="p-3 rounded" style={{ background: "#13141820", border: "1px solid #1f2025" }}>
                <div className="stat-label mb-2" style={{ color: col.color }}>{col.group}</div>
                {col.items.map((item) => (
                  <div key={item} className="flex items-center gap-1.5 py-1" style={{ borderBottom: "1px solid #1a1b1f" }}>
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: col.color }} />
                    <span style={{ color: "#6a6d7a", fontSize: 11 }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Btn label="GO TO INPUT DATA" variant="primary" onClick={() => onNavigate("input")} />
          <Btn label="VIEW FRAME SELECTION" variant="secondary" onClick={() => onNavigate("frames")} />
          <Btn label="START RECONSTRUCTION" variant="ghost" onClick={() => onNavigate("reconstruction")} />
        </div>
      </div>

      {/* Settings drawer */}
      {showSettings && (
        <div className="w-64 border-l overflow-y-auto p-4 flex flex-col gap-3" style={{ background: "#18191d", borderColor: "#2a2b31" }}>
          <div className="stat-label" style={{ color: "#4a4d5a" }}>PROJECT SETTINGS</div>
          {[
            { label: "Coordinate System", value: project?.coordinate_system || "WGS84 / UTM Zone 33N" },
            { label: "Altitude Ref.", value: "Ellipsoidal" },
            { label: "Output Resolution", value: "High (2cm GSD)" },
            { label: "Texture Resolution", value: "4096×4096" },
            { label: "Mesh Density", value: "Dense" },
          ].map((row) => (
            <div key={row.label}>
              <div className="stat-label mb-1" style={{ color: "#4a4d5a" }}>{row.label}</div>
              <div className="px-2 py-1 rounded text-xs" style={{ background: "#1e1f24", color: "#9a9daa", fontFamily: "JetBrains Mono,monospace", border: "1px solid #2a2b31" }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
