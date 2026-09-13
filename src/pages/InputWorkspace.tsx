import { useState } from "react";
import { StatRow, Badge, Btn } from "../components/SharedPrimitives";

export function InputWorkspace() {
  const [validated, setValidated] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {/* Video upload */}
      <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>A. DRONE VIDEO</span>
          <Badge label="✓ LOADED" variant="ok" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col items-center justify-center rounded py-6" style={{ background: "#13141820", border: "2px dashed #2a2b31" }}>
            <div style={{ color: "#3d7fff", fontSize: 20, marginBottom: 6 }}>▶</div>
            <div style={{ color: "#9a9daa", fontSize: 12 }}>DJI_0042.MP4</div>
            <div className="stat-label mt-1" style={{ color: "#4a4d5a" }}>MP4 · 4K · 30fps · 4m 22s · 2.8 GB</div>
          </div>
          <div className="flex flex-col gap-2" style={{ width: 180 }}>
            <StatRow label="Resolution" value="3840×2160" />
            <StatRow label="Frame Rate" value="30 fps" />
            <StatRow label="Duration" value="4m 22s" />
            <StatRow label="File Size" value="2.8 GB" />
            <StatRow label="Codec" value="H.264" />
            <StatRow label="Total Frames" value="7,860" />
          </div>
        </div>
      </div>

      {/* Flight metadata */}
      <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>B. FLIGHT METADATA</span>
          <Badge label="✓ VALID" variant="ok" />
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <StatRow label="GPS Status" value="ACTIVE" accent />
          <StatRow label="Latitude" value="48.8566°N" />
          <StatRow label="Longitude" value="2.3522°E" />
          <StatRow label="Altitude" value="82.4 m" />
          <StatRow label="Flight Speed" value="6.2 m/s" />
          <StatRow label="IMU" value="Available" accent />
          <StatRow label="RTK/PPK" value="RTK" accent />
          <StatRow label="Timestamp" value="09:31:08 UTC" />
        </div>
      </div>

      {/* Camera */}
      <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>C. CAMERA INFORMATION</span>
          <Badge label="✓ CALIBRATED" variant="ok" />
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
          <StatRow label="Camera Model" value="DJI FC3411" />
          <StatRow label="Resolution" value="20 MP" />
          <StatRow label="Focal Length" value="24 mm" />
          <StatRow label="Principal Pt." value="1920, 1080" />
          <StatRow label="Distortion" value="k1=-0.042 k2=0.012" />
          <StatRow label="Cal. Source" value="Pre-calibrated" accent />
        </div>
      </div>

      {/* Validation */}
      <div className="flex items-center gap-3">
        <Btn label="VALIDATE INPUT" variant="primary" onClick={() => setValidated(true)} />
        {validated && <Badge label="ALL CHECKS PASSED" variant="ok" />}
        {!validated && <span style={{ color: "#5a5d6a", fontSize: 11 }}>Run validation before reconstruction</span>}
      </div>
    </div>
  );
}
