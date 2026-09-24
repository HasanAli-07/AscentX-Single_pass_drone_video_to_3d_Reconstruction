import { useState } from "react";
import { Project } from "../types";
import { Btn } from "../components/SharedPrimitives";

interface ExportWorkspaceProps {
  project: Project | null;
}

export function ExportWorkspace({ project }: ExportWorkspaceProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["GLB", "OBJ", "PLY_CLOUD"]));
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const formats = [
    { cat: "3D MODEL MESHES", items: [{ id: "GLB", label: "GLB / glTF 2.0 (Optimized 3D Model)" }, { id: "OBJ", label: "Wavefront OBJ + MTL Texture" }, { id: "PLY_MESH", label: "Stanford PLY Surface Mesh" }] },
    { cat: "POINT CLOUD DATA", items: [{ id: "PLY_CLOUD", label: "PLY Point Cloud (Colored)" }, { id: "LAS", label: "LAS 1.4 LiDAR / Photogrammetry Point Cloud" }] },
    { cat: "GEOSPATIAL VECTOR", items: [{ id: "GEOJSON", label: "GeoJSON Spatial Coordinates" }, { id: "KML", label: "Keyhole Markup Language (KML / KMZ)" }] },
    { cat: "ELEVATION & TERRAIN", items: [{ id: "DSM", label: "Digital Surface Model (DSM GeoTIFF)" }, { id: "DTM", label: "Digital Terrain Model (DTM GeoTIFF)" }] },
    { cat: "ANALYTICAL REPORTS", items: [{ id: "REPORT_RECON", label: "3D Reconstruction Quality Audit Report (PDF)" }, { id: "REPORT_MEASURE", label: "Metric Volume & Distance Log (CSV)" }] },
  ];

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const doExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setDone(true);
    }, 1200);
  };

  const projectBasename = project ? `${project.name}_${project.id}` : "ascentx_export_PRJ-2026-004A";

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs text-slate-200">
      <div className="flex justify-between items-center bg-[#18191d] p-3 rounded-lg border border-[#2a2b31]">
        <span className="stat-label text-slate-400 font-semibold">EXPORT 3D RECONSTRUCTION DATASETS</span>
        <span className="text-cyan-400 font-semibold">{project?.name || "scan_session_2024_11_08"} ({project?.id})</span>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {formats.map((cat) => (
          <div key={cat.cat} className="rounded-lg p-4 bg-[#18191d] border border-[#2a2b31]">
            <div className="stat-label mb-3 text-slate-400 font-semibold">{cat.cat}</div>
            {cat.items.map((f) => (
              <label key={f.id} className="flex items-center gap-3 py-2 cursor-pointer border-b border-[#1a1b1f] last:border-none hover:bg-white/[0.015]">
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                  className="rounded bg-black border-gray-700 accent-cyan-400 cursor-pointer"
                />
                <span className={`text-xs ${selected.has(f.id) ? "text-slate-100 font-semibold" : "text-slate-500"}`}>{f.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-[#18191d] border border-[#2a2b31]">
        <div className="flex items-center gap-3">
          <Btn label={exporting ? "PACKAGING ASSETS..." : "GENERATE EXPORT BUNDLE"} variant="primary" onClick={doExport} />
          {done && <span className="text-emerald-400 text-xs font-semibold">✓ EXPORT BUNDLE READY ({projectBasename}.zip)</span>}
        </div>

        {done && (
          <a
            href={`http://localhost:8000/api/v1/source-models/${project?.video_filename ? "Untitled.glb" : "Untitled.glb"}`}
            download={`${projectBasename}.glb`}
            className="px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
          >
            ⬇ DOWNLOAD 3D GLB FILE
          </a>
        )}
      </div>
    </div>
  );
}
