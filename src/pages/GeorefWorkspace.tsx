import { StatRow, Btn } from "../components/SharedPrimitives";

export function GeorefWorkspace() {
  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Map visualization canvas */}
        <div className="rounded-lg overflow-hidden" style={{ background: "#18191d", border: "1px solid #2a2b31", height: 200 }}>
          <div className="w-full h-full relative" style={{ background: "#0e1420" }}>
            <svg className="w-full h-full" viewBox="0 0 400 180">
              {Array.from({ length: 12 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 15} x2="400" y2={i * 15} stroke="#1a2030" strokeWidth="0.5" />)}
              {Array.from({ length: 27 }, (_, i) => <line key={`v${i}`} x1={i * 15} y1="0" x2={i * 15} y2="180" stroke="#1a2030" strokeWidth="0.5" />)}
              <polyline points="80,40 120,60 180,50 240,70 300,55 340,80 320,120 260,130 200,120 150,110 100,130 80,100 80,40" fill="#3d7fff18" stroke="#3d7fff" strokeWidth="1.2" strokeOpacity="0.7" />
              <rect x="180" y="70" width="80" height="50" rx="2" fill="#00c8d415" stroke="#00c8d4" strokeWidth="1" strokeOpacity="0.8" />
              <circle cx="220" cy="95" r="4" fill="none" stroke="#22c55e" strokeWidth="1.5" />
              <circle cx="220" cy="95" r="1.5" fill="#22c55e" />
              {[[80, 40], [180, 50], [300, 55], [340, 80], [200, 120], [80, 100]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#f59e0b" fillOpacity="0.7" />
              ))}
            </svg>
            <div className="absolute bottom-2 left-3 flex gap-3">
              {[
                { col: "#3d7fff", label: "Flight Path" },
                { col: "#00c8d4", label: "Model" },
                { col: "#22c55e", label: "Reference" },
                { col: "#f59e0b", label: "Waypoints" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.col }} />
                  <span className="stat-label" style={{ color: l.col }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coordinate data */}
        <div className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
          <div className="stat-label mb-3" style={{ color: "#4a4d5a" }}>COORDINATE REFERENCE SYSTEM</div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            <StatRow label="Coordinate System" value="WGS84 UTM 33N" />
            <StatRow label="GPS Accuracy" value="±2 cm" accent />
            <StatRow label="Latitude" value="48.8566°N" />
            <StatRow label="RTK Status" value="FIXED" accent />
            <StatRow label="Longitude" value="2.3522°E" />
            <StatRow label="Scale Factor" value="0.99998" />
            <StatRow label="Altitude" value="82.4 m (MSL)" />
            <StatRow label="North Direction" value="0.00°" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Btn label="SET COORD SYSTEM" variant="primary" />
          <Btn label="APPLY GPS ALIGNMENT" variant="secondary" />
          <Btn label="APPLY RTK/PPK" variant="secondary" />
          <Btn label="RECALCULATE SCALE" variant="ghost" />
        </div>
      </div>
    </div>
  );
}
