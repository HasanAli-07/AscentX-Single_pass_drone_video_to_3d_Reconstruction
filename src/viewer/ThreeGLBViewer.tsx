import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DisplayMode, ViewToggle } from "../types";
import { fetchSourceModels, SourceModelInfo } from "../services/api";

interface ThreeGLBViewerProps {
  displayMode: DisplayMode;
  activeToggles: Set<ViewToggle>;
}

export function ThreeGLBViewer({ displayMode, activeToggles }: ThreeGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedModelRef = useRef<THREE.Group | THREE.Object3D | null>(null);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  const [sourceModels, setSourceModels] = useState<SourceModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("Untitled.glb");
  const [loadingModel, setLoadingModel] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [modelColor, setModelColor] = useState<string>("#00c8d4");
  const [useOriginalMaterials, setUseOriginalMaterials] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [doubleSided, setDoubleSided] = useState<boolean>(true);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(true);
  const [lowSpecMode, setLowSpecMode] = useState<boolean>(false);
  const [modelStats, setModelStats] = useState<{ meshes: number; vertices: number; faces: number } | null>(null);

  // Fetch available source models list
  useEffect(() => {
    fetchSourceModels().then((models) => {
      setSourceModels(models);
      if (models.length > 0) setSelectedModel(models[0].filename);
    });
  }, []);

  // Initialize Three.js Scene, Camera, Lights, Renderer
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d0e11");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(40, 30, 50);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowSpecMode, alpha: false, powerPreference: "high-performance" });
    } catch (e) {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" });
    }
    
    renderer.setClearColor(new THREE.Color("#0d0e11"), 1.0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(lowSpecMode ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = !lowSpecMode;
    rendererRef.current = renderer;

    const canvas = renderer.domElement;
    canvas.style.backgroundColor = "#0d0e11";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    containerRef.current.appendChild(canvas);

    // Orbit Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 2000;
    controls.minDistance = 0.5;
    controlsRef.current = controls;

    // Lights - Bright Multi-Directional Hemisphere Setup for Drone Models
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainDirLight.position.set(100, 200, 100);
    scene.add(mainDirLight);

    const fillDirLight = new THREE.DirectionalLight(0x00c8d4, 1.5);
    fillDirLight.position.set(-100, 100, -100);
    scene.add(fillDirLight);

    const bottomLight = new THREE.DirectionalLight(0x3d7fff, 1.0);
    bottomLight.position.set(0, -100, 0);
    scene.add(bottomLight);

    // Grid Floor
    const grid = new THREE.GridHelper(300, 60, 0x00c8d4, 0x1c1e24);
    grid.position.y = -0.1;
    grid.name = "grid";
    grid.visible = activeToggles.has("grid");
    scene.add(grid);

    // Axes
    const axes = new THREE.AxesHelper(50);
    axes.name = "axes";
    axes.visible = activeToggles.has("axes");
    scene.add(axes);

    // Animation Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      if (loadedModelRef.current && rotationSpeed > 0) {
        loadedModelRef.current.rotation.y += rotationSpeed * 0.008;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [lowSpecMode]);

  // Toggle Grid / Axes
  useEffect(() => {
    if (!sceneRef.current) return;
    const grid = sceneRef.current.getObjectByName("grid");
    if (grid) grid.visible = activeToggles.has("grid");
    const axes = sceneRef.current.getObjectByName("axes");
    if (axes) axes.visible = activeToggles.has("axes");
  }, [activeToggles]);

  // Auto-Frame Camera to Fit Model Bounding Box
  const fitCameraToModel = (object: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;

    const bbox = new THREE.Box3().setFromObject(object);
    if (bbox.isEmpty()) return;

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 10;

    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 20);

    cameraRef.current.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.8);
    cameraRef.current.near = cameraZ / 100;
    cameraRef.current.far = cameraZ * 100;
    cameraRef.current.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  // Load 3D GLB Model
  useEffect(() => {
    if (!sceneRef.current || !selectedModel) return;

    setLoadingModel(true);
    setLoadProgress(15);
    originalMaterialsRef.current.clear();

    // Remove existing model
    if (loadedModelRef.current) {
      sceneRef.current.remove(loadedModelRef.current);
      loadedModelRef.current = null;
    }

    const modelUrl = `http://localhost:8000/api/v1/source-models/${selectedModel}`;

    fetch(modelUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        setLoadProgress(60);
        const loader = new GLTFLoader();
        loader.parse(
          buffer,
          "",
          (gltf) => {
            const model = gltf.scene;

            let meshCount = 0;
            let vertCount = 0;
            let faceCount = 0;

            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                meshCount++;

                if (mesh.geometry) {
                  const pos = mesh.geometry.attributes.position;
                  if (pos) vertCount += pos.count;
                  if (mesh.geometry.index) {
                    faceCount += mesh.geometry.index.count / 3;
                  } else if (pos) {
                    faceCount += pos.count / 3;
                  }
                }

                // Cache original material
                originalMaterialsRef.current.set(mesh, mesh.material);

                // Enable double-sided rendering for complete visibility
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((m) => (m.side = THREE.DoubleSide));
                } else if (mesh.material) {
                  mesh.material.side = THREE.DoubleSide;
                }
              }
            });

            setModelStats({
              meshes: meshCount,
              vertices: vertCount,
              faces: Math.round(faceCount),
            });

            // Center model geometry on ground level
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -bbox.min.y;

            loadedModelRef.current = model;
            sceneRef.current?.add(model);

            fitCameraToModel(model);

            setLoadingModel(false);
            setLoadProgress(100);
          },
          (err) => {
            throw err;
          }
        );
      })
      .catch((err) => {
        console.warn("Using procedural 3D model fallback:", err);

        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.2,
        });

        // Building tower geometry
        const body = new THREE.Mesh(new THREE.BoxGeometry(24, 48, 18), mat);
        body.position.y = 24;
        group.add(body);

        const pod = new THREE.Mesh(new THREE.BoxGeometry(38, 10, 28), mat);
        pod.position.y = 5;
        group.add(pod);

        loadedModelRef.current = group;
        sceneRef.current?.add(group);

        setModelStats({ meshes: 2, vertices: 48, faces: 24 });
        fitCameraToModel(group);
        setLoadingModel(false);
        setLoadProgress(100);
      });
  }, [selectedModel]);

  // Update Scale
  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.scale.set(modelScale, modelScale, modelScale);
  }, [modelScale]);

  // Update Material Customization (Original vs Tint vs Wireframe)
  useEffect(() => {
    if (!loadedModelRef.current) return;

    loadedModelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const orig = originalMaterialsRef.current.get(mesh);

        if (displayMode === "WIRE" || wireframe) {
          mesh.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(modelColor),
            wireframe: true,
            side: THREE.DoubleSide,
          });
        } else if (displayMode === "CONFIDENCE") {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#22c55e"),
            side: THREE.DoubleSide,
            roughness: 0.3,
          });
        } else if (useOriginalMaterials && orig) {
          mesh.material = orig;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => (m.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide));
          } else {
            mesh.material.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
          }
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(modelColor),
            side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            roughness: 0.4,
            metalness: 0.2,
          });
        }
      }
    });
  }, [modelColor, useOriginalMaterials, wireframe, doubleSided, displayMode]);

  const setPresetView = (view: "TOP" | "FRONT" | "SIDE" | "RESET") => {
    if (loadedModelRef.current) {
      if (view === "RESET") {
        fitCameraToModel(loadedModelRef.current);
      } else if (cameraRef.current && controlsRef.current) {
        const bbox = new THREE.Box3().setFromObject(loadedModelRef.current);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const dist = Math.max(size.x, size.y, size.z) * 1.5 || 50;

        if (view === "TOP") cameraRef.current.position.set(center.x, center.y + dist, center.z + 0.01);
        if (view === "FRONT") cameraRef.current.position.set(center.x, center.y + dist * 0.2, center.z + dist);
        if (view === "SIDE") cameraRef.current.position.set(center.x + dist, center.y + dist * 0.2, center.z);

        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0d0e11] overflow-hidden" style={{ background: "#0d0e11" }}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#0d0e11]" style={{ background: "#0d0e11" }} />

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0e11]/90 z-20">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-cyan-400 text-xs font-mono font-semibold">LOADING 3D MODEL ({loadProgress}%)...</span>
          <span className="text-slate-400 text-[10px] font-mono mt-1">{selectedModel} (60.36 MB ArrayBuffer)</span>
        </div>
      )}

      {/* Top Left Model Selector & Info Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 p-1.5 rounded bg-[#18191d]/90 border border-[#2a2b31] backdrop-blur shadow-lg">
          <span className="text-[10px] font-mono text-slate-400">SOURCE MODEL:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#131418] text-cyan-400 text-xs font-mono px-2 py-1 rounded border border-[#2a2b31] outline-none cursor-pointer"
          >
            {sourceModels.map((m) => (
              <option key={m.filename} value={m.filename}>
                {m.name} ({m.size_mb} MB)
              </option>
            ))}
          </select>

          <button
            onClick={() => loadedModelRef.current && fitCameraToModel(loadedModelRef.current)}
            className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[9px] font-mono hover:bg-cyan-500/30 transition-colors cursor-pointer"
          >
            🎯 FIT TO SCREEN
          </button>
        </div>

        {/* Model Statistics Badge */}
        {modelStats && (
          <div className="flex items-center gap-3 px-2.5 py-1 rounded bg-[#18191d]/90 border border-[#2a2b31] text-[9px] font-mono text-slate-400 backdrop-blur w-fit">
            <span>MESHES: <strong className="text-cyan-400">{modelStats.meshes}</strong></span>
            <span>VERTS: <strong className="text-emerald-400">{modelStats.vertices.toLocaleString()}</strong></span>
            <span>FACES: <strong className="text-indigo-400">{modelStats.faces.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* Top Right Customization Panel */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        <button
          onClick={() => setShowControlsPanel((p) => !p)}
          className="px-3 py-1.5 rounded bg-[#18191d]/90 text-cyan-400 border border-[#2a2b31] text-[10px] font-mono backdrop-blur hover:bg-[#1f2025] transition-colors cursor-pointer shadow-lg"
        >
          {showControlsPanel ? "HIDE CUSTOMIZER" : "CUSTOMIZE 3D MODEL"}
        </button>

        {showControlsPanel && (
          <div className="w-64 p-3 rounded-lg bg-[#18191d]/95 border border-[#2a2b31] shadow-2xl flex flex-col gap-3 backdrop-blur text-xs font-mono">
            <div className="text-[10px] text-slate-400 border-b border-[#2a2b31] pb-1 font-semibold flex justify-between items-center">
              <span>3D MODEL CUSTOMIZER</span>
              <span className="text-cyan-400 text-[9px]">REAL-TIME</span>
            </div>

            {/* Material Mode */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Materials Mode</span>
              <button
                onClick={() => setUseOriginalMaterials((m) => !m)}
                className={`px-2 py-0.5 rounded text-[9px] border ${
                  useOriginalMaterials ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                }`}
              >
                {useOriginalMaterials ? "ORIGINAL TEXTURES" : "CUSTOM TINT"}
              </button>
            </div>

            {/* Tint Color Picker (if custom tint mode) */}
            {!useOriginalMaterials && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Custom Tint</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={modelColor}
                    onChange={(e) => setModelColor(e.target.value)}
                    className="w-5 h-5 rounded bg-transparent cursor-pointer border border-[#2a2b31]"
                  />
                  <span className="text-cyan-400 text-[10px]">{modelColor}</span>
                </div>
              </div>
            )}

            {/* Double-Sided Rendering */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Double-Sided Faces</span>
              <button
                onClick={() => setDoubleSided((d) => !d)}
                className={`px-2 py-0.5 rounded text-[9px] border ${doubleSided ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-[#131418] text-slate-400 border-[#2a2b31]"}`}
              >
                {doubleSided ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            {/* Wireframe Toggle */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Wireframe View</span>
              <button
                onClick={() => setWireframe((w) => !w)}
                className={`px-2 py-0.5 rounded text-[9px] border ${wireframe ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-[#131418] text-slate-400 border-[#2a2b31]"}`}
              >
                {wireframe ? "ON" : "OFF"}
              </button>
            </div>

            {/* Model Scale Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Model Scale</span>
                <span className="text-cyan-400">{modelScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={modelScale}
                onChange={(e) => setModelScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Auto Spin Speed */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Auto Spin Speed</span>
                <span className="text-cyan-400">{rotationSpeed}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Left View Preset Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 font-mono text-[9px]">
        {(["TOP", "FRONT", "SIDE", "RESET"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setPresetView(view)}
            className="px-2 py-0.5 rounded bg-[#18191d]/90 text-slate-400 border border-[#2a2b31] backdrop-blur hover:text-cyan-400 transition-colors text-left cursor-pointer"
          >
            {view} VIEW
          </button>
        ))}
      </div>
    </div>
  );
}
