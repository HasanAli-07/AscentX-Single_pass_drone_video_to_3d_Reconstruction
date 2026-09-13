import { useState } from "react";
import { Badge } from "./SharedPrimitives";

export function Console() {
  const [expanded, setExpanded] = useState(false);
  const [logs] = useState<string[]>([
    "[09:31:02] Ingesting video input: DJI_0042.MP4 (3840x2160, 30fps)",
    "[09:31:05] Extracted EXIF metadata: Lat 48.8566 N, Lon 2.3522 E, Alt 82.4m",
    "[09:31:18] Completed frame quality scoring on 7,860 frames",
    "[09:31:42] Selected 1,240 reconstruction frames (15.8% sample rate)",
    "[09:32:01] Camera intrinsics loaded: fx=1450.0 fy=1450.0 cx=960.0 cy=540.0",
    "[09:34:12] SfM Sparse Point Cloud generated: 184,392 points",
    "[09:35:50] AI Depth estimation (DepthAnything v2) computed across selected keyframes",
    "[09:38:55] COLMAP Dense MVS completed: 4.2M points",
    "[09:39:39] Mesh Generation (Poisson surface reconstruction): 72% complete",
  ]);

  return (
    <footer
      className="border-t flex flex-col transition-all flex-shrink-0"
      style={{ background: "#131418", borderColor: "#2a2b31", height: expanded ? 180 : 36 }}
    >
      {/* Console top bar */}
      <div className="h-9 px-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-3">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>PROCESSING CONSOLE</span>
          <Badge label="MESH GENERATION ● 72%" variant="running" />
          <span style={{ color: "#5a5d6a", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
            Poisson Surface Reconstruction...
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="stat-label" style={{ color: "#3a3d4a" }}>GPU</span>
            <span style={{ color: "#00c8d4", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>78%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="stat-label" style={{ color: "#3a3d4a" }}>VRAM</span>
            <span style={{ color: "#00c8d4", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>4.2 GB / 8.0 GB</span>
          </div>
          <span className="stat-label" style={{ color: expanded ? "#00c8d4" : "#4a4d5a" }}>{expanded ? "▼ COLLAPSE" : "▲ LOGS"}</span>
        </div>
      </div>

      {/* Expanded terminal log output */}
      {expanded && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs border-t" style={{ background: "#0d0e11", borderColor: "#1f2025" }}>
          {logs.map((log, idx) => (
            <div key={idx} className="py-0.5" style={{ color: "#7a7d8a", fontSize: 11 }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
