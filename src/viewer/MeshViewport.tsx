import React, { useState, useRef, useCallback } from "react";
import { DisplayMode, ViewToggle } from "../types";

interface MeshViewportProps {
  displayMode: DisplayMode;
  activeToggles: Set<ViewToggle>;
}

export function MeshViewport({ displayMode, activeToggles }: MeshViewportProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState({ x: 28, y: -35 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const orbitMode = useRef(true);

  const resetView = () => { setRotation({ x: 28, y: -35 }); setZoom(1); setPan({ x: 0, y: 0 }); };
  const setView = (rx: number, ry: number) => { setRotation({ x: rx, y: ry }); setZoom(1); setPan({ x: 0, y: 0 }); };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    orbitMode.current = !e.shiftKey;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (orbitMode.current) setRotation(r => ({ x: r.x + dy * 0.4, y: r.y + dx * 0.4 }));
    else setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);
  
  const onMouseUp = useCallback(() => { dragging.current = false; }, []);
  
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const proj = (x: number, y: number, z: number) => {
    const ryR = (rotation.y * Math.PI) / 180;
    const rxR = (rotation.x * Math.PI) / 180;
    const x1 = x * Math.cos(ryR) + z * Math.sin(ryR);
    const z1 = -x * Math.sin(ryR) + z * Math.cos(ryR);
    const y1 = y * Math.cos(rxR) - z1 * Math.sin(rxR);
    const z2 = y * Math.sin(rxR) + z1 * Math.cos(rxR);
    const s = 900 / (900 + z2 * 0.4);
    return { px: 400 + (x1 * s * zoom + pan.x), py: 300 + (y1 * s * zoom + pan.y), z: z2 };
  };

  type Face3D = { verts: [number,number,number][]; kind: "facade"|"roof"|"window"|"podium"|"annex"|"detail"; id: string };
  const buildingFaces: Face3D[] = [];

  const addBox = (x0:number, x1:number, y0:number, y1:number, z0:number, z1:number, kind: Face3D["kind"], pfx:string) => {
    buildingFaces.push(
      { verts:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], kind, id:pfx+"top" },
      { verts:[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]], kind, id:pfx+"bot" },
      { verts:[[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]], kind, id:pfx+"lft" },
      { verts:[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], kind, id:pfx+"rgt" },
      { verts:[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], kind, id:pfx+"frt" },
      { verts:[[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1]], kind, id:pfx+"bck" },
    );
  };

  addBox(-90,90,0,-28,-68,68,"podium","pod_");
  addBox(-52,52,-28,-220,-42,42,"facade","twr_");
  addBox(-90,-56,-28,-80,-50,50,"annex","anx_");
  addBox(56,90,-28,-80,-50,50,"annex","anx2_");
  addBox(-30,30,-220,-240,-20,20,"roof","rmech_");
  addBox(-52,52,-218,-224,-42,42,"detail","rpar_");
  addBox(-40,40,-210,-220,-30,30,"detail","rset_");
  for (const cx of [-52,44]) for (const cz of [-42,34])
    addBox(cx,cx+8,-28,-220,cz,cz+8,"detail",`col_${cx}_${cz}_`);
  addBox(-110,110,0,4,-90,90,"podium","gnd_");

  const towerFloors = 14, towerCols = 4;
  for (let fl=0; fl<towerFloors; fl++) {
    const fy0=-35-fl*13, fy1=fy0-9;
    for (let wc=0; wc<towerCols; wc++) {
      const wx0=-40+wc*22;
      buildingFaces.push({ verts:[[wx0,fy0,-42],[wx0+14,fy0,-42],[wx0+14,fy1,-42],[wx0,fy1,-42]], kind:"window", id:`win_f_${fl}_${wc}` });
    }
    for (let wc=0; wc<3; wc++) {
      const wz0=-30+wc*22;
      buildingFaces.push({ verts:[[52,fy0,wz0],[52,fy0,wz0+14],[52,fy1,wz0+14],[52,fy1,wz0]], kind:"window", id:`win_r_${fl}_${wc}` });
    }
  }

  const confColors: Record<string,string> = {
    high: "#22c55e", med: "#f59e0b", low: "#ef4444", insuff: "#7a3d7a"
  };

  type RF = { projected:{px:number;py:number}[]; avgZ:number; kind:Face3D["kind"]; normal:number; id:string };
  const rendered: RF[] = buildingFaces.map(f => {
    const projected = f.verts.map(([x,y,z]) => { const p=proj(x,y,z); return {px:p.px,py:p.py,z:p.z}; });
    const avgZ = projected.reduce((s,p)=>s+(p as any).z,0)/projected.length;
    const v0=projected[0],v1=projected[1],v2=projected[2];
    const cross=(v1.px-v0.px)*(v2.py-v0.py)-(v1.py-v0.py)*(v2.px-v0.px);
    return {projected:projected.map(p=>({px:p.px,py:p.py})),avgZ,kind:f.kind,normal:cross,id:f.id};
  });
  const visible = rendered.filter(f=>f.normal>0||f.kind==="window").sort((a,b)=>b.avgZ-a.avgZ);

  const origin = proj(0,4,0), axisX=proj(60,4,0), axisY=proj(0,-56,0), axisZ=proj(0,4,60);

  const camPositions = Array.from({length:12},(_,i)=>{
    const a=(i/12)*Math.PI*2;
    return proj(Math.cos(a)*160, -80, Math.sin(a)*160);
  });
  const fpPoints = [...camPositions, camPositions[0]].map(p=>`${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");

  const bbCorners = [
    [-110,4,-90],[-110,4,90],[110,4,90],[110,4,-90],
    [-110,-240,-90],[-110,-240,90],[110,-240,90],[110,-240,-90],
  ].map(([x,y,z])=>proj(x,y,z));
  const bbEdges: [number,number][] = [
    [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];

  const getFaceColor = (f: RF) => {
    if (displayMode === "CONFIDENCE") {
      const h = parseInt(f.id.charCodeAt(0).toString()) % 4;
      const keys = ["high","high","med","low"];
      const col = confColors[keys[h] ?? "med"];
      return { fill: `${col}25`, stroke: col, sw: "0.8" };
    }
    if (displayMode === "WIRE") return { fill: "none", stroke: "#00c8d4", sw: "0.6" };
    if (displayMode === "POINT CLOUD") return { fill: "none", stroke: "none", sw: "0" };
    if (f.kind==="window") return { fill: "#00c8d420", stroke: "#00c8d4", sw: "0.7" };
    if (f.kind==="roof")   return { fill: "#1a2535", stroke: "#3d7fff", sw: "0.8" };
    if (f.kind==="detail") return { fill: "#161820", stroke: "#2a3a55", sw: "0.6" };
    if (f.kind==="podium") return { fill: "#13181f", stroke: "#00c8d4", sw: "0.7" };
    if (f.kind==="annex")  return { fill: "#12181f", stroke: "#00c8d4", sw: "0.6" };
    if (displayMode==="SOLID") return { fill: "#1a2030", stroke: "#2a3040", sw: "0.4" };
    if (displayMode==="TEXTURED") return { fill: "#182030", stroke: "#00c8d4", sw: "0.5" };
    return { fill: "#0e1520", stroke: "#00c8d4", sw: "0.8" };
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        className="relative flex-1 viewport-grid overflow-hidden cursor-crosshair"
        style={{ background: "#0d0e11" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
      >
        <svg ref={svgRef} className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00c8d4" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#00c8d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="confGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="400" cy="420" rx="180" ry="30" fill={displayMode==="CONFIDENCE" ? "url(#confGlow)" : "url(#meshGlow)"} />

          {/* Grid floor */}
          {activeToggles.has("grid") && [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(i=>{
            const a=proj(i*22,4,-140), b=proj(i*22,4,140);
            const c=proj(-140,4,i*22), d=proj(140,4,i*22);
            return <g key={i}>
              <line x1={a.px} y1={a.py} x2={b.px} y2={b.py} stroke="#1c1e24" strokeWidth={i===0?1.2:0.6} strokeOpacity={i===0?0.8:0.5}/>
              <line x1={c.px} y1={c.py} x2={d.px} y2={d.py} stroke="#1c1e24" strokeWidth={i===0?1.2:0.6} strokeOpacity={i===0?0.8:0.5}/>
            </g>;
          })}

          {/* Bounding box */}
          {activeToggles.has("bbox") && bbEdges.map(([a,b],i)=>(
            <line key={i} x1={bbCorners[a].px} y1={bbCorners[a].py} x2={bbCorners[b].px} y2={bbCorners[b].py}
              stroke="#f59e0b" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 3"/>
          ))}

          {/* Flight path */}
          {activeToggles.has("flightpath") && (
            <polyline points={fpPoints} fill="none" stroke="#3d7fff" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="6 4"/>
          )}

          {/* Building */}
          {displayMode !== "POINT CLOUD" && visible.map(f=>{
            const pts=f.projected.map(p=>`${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
            const c=getFaceColor(f);
            return <polygon key={f.id} points={pts} fill={c.fill} stroke={c.stroke} strokeWidth={c.sw} strokeOpacity={0.7}/>;
          })}

          {/* Point cloud dots */}
          {displayMode==="POINT CLOUD" && visible.filter(f=>f.kind!=="window").map(f=>{
            const cx2=f.projected.reduce((s,p)=>s+p.px,0)/f.projected.length;
            const cy2=f.projected.reduce((s,p)=>s+p.py,0)/f.projected.length;
            const col = f.kind==="roof"?"#3d7fff":f.kind==="podium"?"#7a7d8a":"#00c8d4";
            return <circle key={f.id} cx={cx2.toFixed(1)} cy={cy2.toFixed(1)} r="1" fill={col} fillOpacity="0.7"/>;
          })}

          {/* Camera positions */}
          {activeToggles.has("cameras") && camPositions.map((p,i)=>(
            <g key={i}>
              <rect x={p.px-4} y={p.py-3} width="8" height="6" rx="1" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.7"/>
              <circle cx={p.px} cy={p.py} r="1.5" fill="#f59e0b" fillOpacity="0.8"/>
            </g>
          ))}

          {/* Axes */}
          {activeToggles.has("axes") && <>
            <line x1={origin.px} y1={origin.py} x2={axisX.px} y2={axisX.py} stroke="#ef4444" strokeWidth="1.5"/>
            <text x={axisX.px+4} y={axisX.py+4} fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">X</text>
            <line x1={origin.px} y1={origin.py} x2={axisY.px} y2={axisY.py} stroke="#22c55e" strokeWidth="1.5"/>
            <text x={axisY.px+4} y={axisY.py-4} fill="#22c55e" fontSize="9" fontFamily="JetBrains Mono">Y</text>
            <line x1={origin.px} y1={origin.py} x2={axisZ.px} y2={axisZ.py} stroke="#3d7fff" strokeWidth="1.5"/>
            <text x={axisZ.px+4} y={axisZ.py+4} fill="#3d7fff" fontSize="9" fontFamily="JetBrains Mono">Z</text>
          </>}

          {/* Confidence legend */}
          {displayMode==="CONFIDENCE" && [
            {label:"HIGH",col:"#22c55e",y:30},{label:"MED",col:"#f59e0b",y:44},
            {label:"LOW",col:"#ef4444",y:58},{label:"NONE",col:"#7a3d7a",y:72}
          ].map(({label,col,y})=>(
            <g key={label}>
              <rect x="720" y={y} width="8" height="8" rx="1" fill={col} fillOpacity="0.4" stroke={col} strokeWidth="0.6"/>
              <text x="732" y={y+7} fill={col} fontSize="8" fontFamily="JetBrains Mono">{label}</text>
            </g>
          ))}

          {/* Mode watermark */}
          <text x="16" y="28" fill="#1e2030" fontSize="10" fontFamily="JetBrains Mono" fontWeight="600" letterSpacing="2">{displayMode}</text>
        </svg>

        {/* Corner info */}
        <div className="absolute top-3 left-3 flex flex-col gap-0.5">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>scan_session_2024_11_08</span>
          <span className="stat-label" style={{ color: "#2a2d35" }}>BUILDING MESH · 184K VERTS</span>
        </div>
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-0.5">
          <span className="stat-label" style={{ color: "#4a4d5a" }}>ZOOM {(zoom*100).toFixed(0)}%</span>
          <span className="stat-label" style={{ color: "#2a2d35" }}>ROT {rotation.x.toFixed(0)}° / {rotation.y.toFixed(0)}°</span>
        </div>

        {/* View buttons bottom-left */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1">
          {[
            {label:"TOP",   rx:-88, ry:0},
            {label:"FRONT", rx:0,   ry:0},
            {label:"SIDE",  rx:0,   ry:-90},
          ].map(v=>(
            <button key={v.label} onClick={()=>setView(v.rx,v.ry)}
              className="px-2 py-0.5 rounded text-left transition-opacity hover:opacity-80 cursor-pointer"
              style={{ background:"#18191d90", color:"#4a4d5a", fontFamily:"JetBrains Mono,monospace", fontSize:9, border:"1px solid #2a2b3160" }}>
              {v.label}
            </button>
          ))}
          <button onClick={resetView}
            className="px-2 py-0.5 rounded transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background:"#00c8d418", color:"#00c8d4", fontFamily:"JetBrains Mono,monospace", fontSize:9, border:"1px solid #00c8d430" }}>
            RESET
          </button>
        </div>

        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)" }}/>
      </div>
    </div>
  );
}
