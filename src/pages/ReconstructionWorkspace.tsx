import { Badge, Btn } from "../components/SharedPrimitives";

export function ReconstructionWorkspace() {
  const stages = [
    { name: "Frame Processing", status: "COMPLETED", pct: 100, time: "00:18", gpu: 0, output: "7,860 frames decoded" },
    { name: "Camera Calibration", status: "COMPLETED", pct: 100, time: "00:42", gpu: 0, output: "Focal length 24.1mm" },
    { name: "SfM", status: "COMPLETED", pct: 100, time: "02:11", gpu: 34, output: "184,392 sparse pts" },
    { name: "AI Depth Estimation", status: "COMPLETED", pct: 100, time: "01:38", gpu: 92, output: "DepthAnything v2" },
    { name: "Dense MVS", status: "COMPLETED", pct: 100, time: "03:05", gpu: 87, output: "Dense matching" },
    { name: "Dense Point Cloud", status: "COMPLETED", pct: 100, time: "01:22", gpu: 65, output: "4.2M points" },
    { name: "Mesh Generation", status: "RUNNING", pct: 72, time: "00:44", gpu: 78, output: "Poisson recon..." },
    { name: "Texture Generation", status: "QUEUED", pct: 0, time: "—", gpu: 0, output: "Pending" },
    { name: "Georeferencing", status: "QUEUED", pct: 0, time: "—", gpu: 0, output: "Pending" },
  ];
  const statusVariant: Record<string, any> = {
    COMPLETED: "ok",
    RUNNING: "running",
    QUEUED: "queued",
    WARNING: "warn",
    FAILED: "err",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      <div className="flex gap-2">
        <Btn label="START RECONSTRUCTION" variant="primary" />
        <Btn label="PAUSE" variant="ghost" />
        <Btn label="RESUME" variant="ghost" />
        <Btn label="CANCEL" variant="danger" />
      </div>
      <div className="rounded-lg overflow-hidden" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        <div className="px-3 py-2 border-b" style={{ borderColor: "#1f2025" }}>
          <span className="stat-label" style={{ color: "#4a4d5a" }}>RECONSTRUCTION PIPELINE</span>
        </div>
        {stages.map((s, i) => (
          <div key={s.name}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #1a1b1f" }}>
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
                  <div className="h-1 rounded" style={{ background: "#1e1f24" }}>
                    <div
                      className="h-1 rounded"
                      style={{ width: `${s.pct}%`, background: s.status === "COMPLETED" ? "#22c55e" : "linear-gradient(90deg,#00c8d4,#3d7fff)" }}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-right flex-shrink-0">
                <div>
                  <div className="stat-label" style={{ color: "#3a3d4a" }}>TIME</div>
                  <div style={{ color: "#6a6d7a", fontSize: 11, fontFamily: "JetBrains Mono,monospace" }}>{s.time}</div>
                </div>
                <div>
                  <div className="stat-label" style={{ color: "#3a3d4a" }}>GPU</div>
                  <div style={{ color: s.gpu > 80 ? "#f59e0b" : "#6a6d7a", fontSize: 11, fontFamily: "JetBrains Mono,monospace" }}>{s.gpu ? `${s.gpu}%` : "—"}</div>
                </div>
                <div style={{ width: 160 }}>
                  <div className="stat-label" style={{ color: "#3a3d4a" }}>OUTPUT</div>
                  <div style={{ color: "#5a5d6a", fontSize: 11 }}>{s.output}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
