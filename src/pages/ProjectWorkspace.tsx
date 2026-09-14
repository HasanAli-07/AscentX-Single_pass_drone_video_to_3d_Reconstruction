import { useState } from "react";
import { Project } from "../types";
import { Badge, Btn } from "../components/SharedPrimitives";
import { updateProjectDetails } from "../services/api";

interface ProjectWorkspaceProps {
  project: Project | null;
  onNavigate: (section: any) => void;
  onUpdateProject?: (updated: Project) => void;
}

export function ProjectWorkspace({ project, onNavigate, onUpdateProject }: ProjectWorkspaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(project?.name || "");

  if (!project) return null;

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const updated = { ...project, name: newName.trim() };
    if (onUpdateProject) onUpdateProject(updated);
    setIsEditingName(false);
    await updateProjectDetails(project.id, { name: newName.trim() });
  };

  const handleCrsChange = async (crs: string) => {
    const updated = { ...project, coordinate_system: crs };
    if (onUpdateProject) onUpdateProject(updated);
    await updateProjectDetails(project.id, { coordinate_system: crs });
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "4m 22s";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex-1 flex overflow-hidden font-mono text-xs text-slate-200">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Project card */}
        <div className="rounded-lg p-4 bg-[#18191d] border border-[#2a2b31]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-[#131418] text-cyan-400 font-semibold px-2 py-0.5 rounded border border-[#2a2b31] outline-none text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-0.5 rounded bg-[#131418] text-slate-400 border border-[#2a2b31] text-[10px]"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-slate-100 text-sm font-semibold">{project.name}</span>
                    <Badge label={project.status} variant={project.status === "COMPLETED" ? "ok" : "running"} />
                  </>
                )}
              </div>
              <span className="stat-label text-slate-400">
                {project.id} · Created {new Date(project.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-1.5">
              <Btn label="RENAME" variant="ghost" onClick={() => { setNewName(project.name); setIsEditingName(true); }} />
              <Btn label="SETTINGS" variant="secondary" onClick={() => setShowSettings((s) => !s)} />
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
            {[
              { label: "Input Video", value: project.video_filename || "DJI_0042.MP4", ok: !!project.video_filename },
              { label: "Duration", value: formatDuration(project.video_duration_sec), ok: true },
              { label: "Resolution & FPS", value: `${project.video_resolution || "3840×2160"} (${project.video_fps || 30}fps)`, ok: true },
              { label: "GPS Telemetry", value: project.has_gps ? "GPS Lock Active" : "Default Fix", ok: project.has_gps },
              { label: "IMU / RTK", value: project.has_imu ? "RTK Active" : "Standard IMU", ok: project.has_imu },
              { label: "Camera Intrinsics", value: project.has_calibration ? "Pre-calibrated" : "Default Intrinsics", ok: project.has_calibration },
            ].map((row) => (
              <div key={row.label} className="p-2.5 rounded bg-[#131418]/60 border border-[#1f2025]">
                <div className="stat-label mb-0.5 text-slate-400">{row.label}</div>
                <div className={`text-xs font-semibold ${row.ok ? "text-emerald-400" : "text-amber-400"}`}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline summary */}
        <div className="rounded-lg p-4 bg-[#18191d] border border-[#2a2b31]">
          <div className="stat-label mb-3 text-slate-400">SINGLE-PASS RECONSTRUCTION PIPELINE</div>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            {[
              {
                group: "1. INPUT & METADATA",
                items: [
                  project.video_filename ? `Video: ${project.video_filename}` : "Single-pass drone video",
                  project.has_gps ? "GPS / RTK Telemetry: Active" : "GPS / Flight Metadata",
                  project.has_calibration ? "Intrinsics: Calibrated" : "Camera Optical Model",
                ],
                color: "#3d7fff",
              },
              {
                group: "2. RECONSTRUCTION ENGINE",
                items: [
                  `Total Frames: ${(project.total_frames || 7860).toLocaleString()}`,
                  `Selected Keys: ${(project.selected_frames || 1240).toLocaleString()}`,
                  `Dense Points: ${(project.dense_points || 4200000).toLocaleString()}`,
                ],
                color: "#00c8d4",
              },
              {
                group: "3. 3D MODELS & EXPORT",
                items: [
                  "Textured 3D Mesh (GLB / OBJ)",
                  "Georeferenced Point Cloud (LAS)",
                  "Metric Height & Distance Logs",
                ],
                color: "#22c55e",
              },
            ].map((col) => (
              <div key={col.group} className="p-3 rounded bg-[#131418]/60 border border-[#1f2025]">
                <div className="stat-label mb-2 font-semibold" style={{ color: col.color }}>{col.group}</div>
                {col.items.map((item) => (
                  <div key={item} className="flex items-center gap-1.5 py-1 border-b border-[#1a1b1f] last:border-none">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col.color }} />
                    <span className="text-slate-300 text-[11px]">{item}</span>
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
        <div className="w-72 border-l border-[#2a2b31] overflow-y-auto p-4 flex flex-col gap-3 bg-[#18191d]">
          <div className="stat-label font-semibold text-slate-400 border-b border-[#2a2b31] pb-1">
            PROJECT CONFIGURATION
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="stat-label text-slate-400">Coordinate System (CRS)</span>
            <select
              value={project.coordinate_system}
              onChange={(e) => handleCrsChange(e.target.value)}
              className="bg-[#131418] text-cyan-400 px-2 py-1 rounded border border-[#2a2b31] outline-none text-xs"
            >
              <option value="WGS84 / UTM Zone 33N">WGS84 / UTM Zone 33N (EPSG:32633)</option>
              <option value="WGS84 / UTM Zone 32N">WGS84 / UTM Zone 32N (EPSG:32632)</option>
              <option value="WGS84 Geographic">WGS84 Geographic (EPSG:4326)</option>
              <option value="Web Mercator">Web Mercator (EPSG:3857)</option>
            </select>
          </div>

          {[
            { label: "Altitude Ref.", value: "Ellipsoidal (Height above WGS84)" },
            { label: "Output GSD", value: "High Precision (2.0 cm/px)" },
            { label: "Texture Resolution", value: "4096×4096 (4K Atlas)" },
            { label: "Mesh Density Mode", value: "Dense Aerial Photogrammetry" },
          ].map((row) => (
            <div key={row.label}>
              <div className="stat-label mb-1 text-slate-400">{row.label}</div>
              <div className="px-2 py-1 rounded text-[11px] bg-[#1e1f24] text-slate-300 border border-[#2a2b31]">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
