import { useState } from "react";
import { Btn } from "../components/SharedPrimitives";

export function ExportWorkspace() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["OBJ", "PLY_CLOUD"]));
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const formats = [
    { cat: "3D MODEL", items: [{ id: "OBJ", label: "OBJ + MTL" }, { id: "PLY_MESH", label: "PLY Mesh" }, { id: "GLB", label: "GLB / glTF" }] },
    { cat: "POINT CLOUD", items: [{ id: "PLY_CLOUD", label: "PLY Cloud" }, { id: "LAS", label: "LAS 1.4" }] },
    { cat: "GEOSPATIAL", items: [{ id: "GEOJSON", label: "GeoJSON" }, { id: "KML", label: "KML" }] },
    { cat: "TERRAIN", items: [{ id: "DSM", label: "DSM (GeoTIFF)" }, { id: "DTM", label: "DTM (GeoTIFF)" }] },
    { cat: "REPORTS", items: [{ id: "REPORT_RECON", label: "Reconstruction Report" }, { id: "REPORT_QUALITY", label: "Quality Report" }, { id: "REPORT_MEASURE", label: "Measurement Report" }] },
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
    }, 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {formats.map((cat) => (
          <div key={cat.cat} className="rounded-lg p-4" style={{ background: "#18191d", border: "1px solid #2a2b31" }}>
            <div className="stat-label mb-3" style={{ color: "#4a4d5a" }}>{cat.cat}</div>
            {cat.items.map((f) => (
              <label key={f.id} className="flex items-center gap-3 py-2 cursor-pointer" style={{ borderBottom: "1px solid #1a1b1f" }}>
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="rounded bg-black border-gray-700" />
                <span style={{ color: selected.has(f.id) ? "#e2e4ea" : "#6a6d7a", fontSize: 12 }}>{f.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Btn label={exporting ? "EXPORTING ARCHIVE..." : "GENERATE EXPORT BUNDLE"} variant="primary" onClick={doExport} />
        {done && <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "JetBrains Mono,monospace" }}>✓ EXPORT READY (ascentx_export_PRJ-20241108.zip)</span>}
      </div>
    </div>
  );
}
