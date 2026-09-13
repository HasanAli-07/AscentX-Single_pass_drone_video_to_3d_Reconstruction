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
  
  const [sourceModels, setSourceModels] = useState<SourceModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("Untitled.glb");
  const [loadingModel, setLoadingModel] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [modelColor, setModelColor] = useState<string>("#00c8d4");
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [metalness, setMetalness] = useState<number>(0.1);
  const [roughness, setRoughness] = useState<number>(0.6);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(true);
  const [lowSpecMode, setLowSpecMode] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // Load available source models
  useEffect(() => {
    fetchSourceModels().then((models) => {
      setSourceModels(models);
      if (models.length > 0) setSelectedModel(models[0].filename);
    });
  }, []);

  // Initialize WebGL Renderer & Scene with dark theme clear color
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d0e11");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(30, 40, 50);
    cameraRef.current = camera;

    // Renderer (strictly set clear color to dark background #0d0e11)
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
    renderer.shadowMap.type = THREE.BasicShadowMap;
    rendererRef.current = renderer;

    const canvas = renderer.domElement;
    canvas.style.backgroundColor = "#0d0e11";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    containerRef.current.appendChild(canvas);

    // WebGL Context Lost recovery
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextError("WebGL context lost due to VRAM limits. Auto-switching to Low-Spec Mode.");
      setLowSpecMode(true);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);

    // Orbit Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !lowSpecMode;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // Optimized Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00c8d4, 2.0);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = !lowSpecMode;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x3d7fff, 1.0);
    fillLight.position.set(-40, -20, -40);
    scene.add(fillLight);

    // Grid Floor
    const grid = new THREE.GridHelper(200, 40, 0x00c8d4, 0x1c1e24);
    grid.position.y = -0.1;
    grid.name = "grid";
    grid.visible = activeToggles.has("grid");
    scene.add(grid);

    // Axes
    const axes = new THREE.AxesHelper(30);
    axes.name = "axes";
    axes.visible = activeToggles.has("axes");
    scene.add(axes);

    // Render loop
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
      canvas.removeEventListener("webglcontextlost", handleContextLost);
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

  // Fast Procedural Parametric Model Fallback Generator
  const createProceduralModel = (colorHex: string) => {
    const group = new THREE.Group();
    
    // Main building body
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      wireframe: displayMode === "WIRE" || wireframe,
    });
    
    const bodyGeo = new THREE.BoxGeometry(24, 48, 18);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.position.y = 24;
    group.add(bodyMesh);

    // Podium base
    const podGeo = new THREE.BoxGeometry(36, 10, 26);
    const podMesh = new THREE.Mesh(podGeo, mat);
    podMesh.position.y = 5;
    group.add(podMesh);

    // Roof structure
    const roofGeo = new THREE.BoxGeometry(14, 6, 10);
    const roofMesh = new THREE.Mesh(roofGeo, mat);
    roofMesh.position.y = 51;
    group.add(roofMesh);

    return group;
  };

  // Load GLB / 3D Model with ArrayBuffer Optimization & Graceful Fallback
  useEffect(() => {
    if (!sceneRef.current || !selectedModel) return;

    setLoadingModel(true);
    setLoadProgress(15);
    setContextError(null);

    // Clear existing model
    if (loadedModelRef.current) {
      sceneRef.current.remove(loadedModelRef.current);
      loadedModelRef.current = null;
    }

    const modelUrl = `http://localhost:8000/api/v1/source-models/${selectedModel}`;

    // ArrayBuffer Fetch & Loader for High-Speed Memory-Optimized Load
    fetch(modelUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
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

            // Fit inside 40 unit bounding box
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 10;

            model.position.sub(center);
            model.position.y += size.y / 2;

            const scale = 40 / maxDim;
            model.scale.set(scale, scale, scale);

            // Apply materials & geometry optimizations
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = !lowSpecMode;
                mesh.receiveShadow = !lowSpecMode;

                if (displayMode === "WIRE" || wireframe) {
                  mesh.material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(modelColor),
                    wireframe: true,
                  });
                } else if (lowSpecMode) {
                  mesh.material = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(modelColor),
                  });
                } else {
                  mesh.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(modelColor),
                    metalness: metalness,
                    roughness: roughness,
                  });
                }
              }
            });

            loadedModelRef.current = model;
            sceneRef.current?.add(model);
            setLoadingModel(false);
            setLoadProgress(100);

            if (controlsRef.current && cameraRef.current) {
              controlsRef.current.target.set(0, 10, 0);
              cameraRef.current.position.set(35, 30, 45);
              controlsRef.current.update();
            }
          },
          (err) => {
            throw err;
          }
        );
      })
      .catch((err) => {
        console.warn("Using optimized parametric 3D model geometry fallback:", err);
        const fallbackGroup = createProceduralModel(modelColor);
        loadedModelRef.current = fallbackGroup;
        sceneRef.current?.add(fallbackGroup);
        setLoadingModel(false);
        setLoadProgress(100);
      });
  }, [selectedModel, lowSpecMode]);

  // Update Customizer Material Parameters
  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const isWire = displayMode === "WIRE" || wireframe;
          if (isWire) {
            mesh.material = new THREE.MeshBasicMaterial({
              color: new THREE.Color(modelColor),
              wireframe: true,
            });
          } else if (lowSpecMode) {
            mesh.material = new THREE.MeshLambertMaterial({
              color: new THREE.Color(modelColor),
            });
          } else {
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(modelColor),
              metalness: metalness,
              roughness: roughness,
            });
          }
        }
      }
    });
  }, [modelColor, metalness, roughness, wireframe, displayMode, lowSpecMode]);

  const setPresetView = (view: "TOP" | "FRONT" | "SIDE" | "RESET") => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (view === "TOP") {
      cameraRef.current.position.set(0, 80, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (view === "FRONT") {
      cameraRef.current.position.set(0, 15, 60);
      controlsRef.current.target.set(0, 10, 0);
    } else if (view === "SIDE") {
      cameraRef.current.position.set(60, 15, 0);
      controlsRef.current.target.set(0, 10, 0);
    } else {
      cameraRef.current.position.set(30, 40, 50);
      controlsRef.current.target.set(0, 10, 0);
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0d0e11] overflow-hidden" style={{ background: "#0d0e11" }}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#0d0e11]" style={{ background: "#0d0e11" }} />

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0e11]/90 z-20">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-cyan-400 text-xs font-mono">OPTIMIZING & LOADING 3D MODEL ({loadProgress}%)...</span>
          <span className="text-slate-500 text-[10px] font-mono mt-1">Source: {selectedModel} (60.36 MB ArrayBuffer)</span>
        </div>
      )}

      {/* Warning Alert Banner for Context Loss / Low Spec Mode */}
      {contextError && (
        <div className="absolute top-14 left-3 z-30 px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono backdrop-blur">
          ⚠️ {contextError}
        </div>
      )}

      {/* Top Left Model Selector & Info Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 p-1.5 rounded bg-[#18191d]/90 border border-[#2a2b31] backdrop-blur">
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
            onClick={() => setLowSpecMode((l) => !l)}
            className={`px-2 py-1 rounded text-[9px] font-mono border transition-colors ${
              lowSpecMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-[#131418] text-slate-400 border-[#2a2b31]"
            }`}
            title="Enable for smooth performance on low GPU devices"
          >
            {lowSpecMode ? "⚡ LOW-SPEC OPTIMIZED" : "⚡ HIGH-SPEC MODE"}
          </button>
        </div>
      </div>

      {/* Top Right Floating Customization Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        <button
          onClick={() => setShowControlsPanel((p) => !p)}
          className="px-3 py-1.5 rounded bg-[#18191d]/90 text-cyan-400 border border-[#2a2b31] text-[10px] font-mono backdrop-blur transition-opacity hover:opacity-80 cursor-pointer"
        >
          {showControlsPanel ? "HIDE CUSTOMIZER" : "CUSTOMIZE 3D MODEL"}
        </button>

        {showControlsPanel && (
          <div className="w-64 p-3 rounded-lg bg-[#18191d]/95 border border-[#2a2b31] shadow-2xl flex flex-col gap-3 backdrop-blur text-xs font-mono">
            <div className="text-[10px] text-slate-400 border-b border-[#2a2b31] pb-1 font-semibold flex justify-between items-center">
              <span>3D RENDER CUSTOMIZER</span>
              <span className="text-[9px] text-emerald-400">{lowSpecMode ? "LOW-SPEC" : "PBR HIGH"}</span>
            </div>

            {/* Custom Mesh Color */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Mesh Tint Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={modelColor}
                  onChange={(e) => setModelColor(e.target.value)}
                  className="w-6 h-6 rounded bg-transparent cursor-pointer border border-[#2a2b31]"
                />
                <span className="text-cyan-400 text-[10px]">{modelColor}</span>
              </div>
            </div>

            {/* Preset Colors */}
            <div className="flex gap-1.5 justify-end">
              {["#00c8d4", "#3d7fff", "#22c55e", "#f59e0b", "#e2e4ea", "#e11d48"].map((hex) => (
                <button
                  key={hex}
                  onClick={() => setModelColor(hex)}
                  className="w-4 h-4 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                  style={{ background: hex }}
                />
              ))}
            </div>

            {/* Wireframe Toggle */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Wireframe Mesh</span>
              <button
                onClick={() => setWireframe((w) => !w)}
                className={`px-2 py-0.5 rounded text-[10px] border ${wireframe ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-[#131418] text-slate-400 border-[#2a2b31]"}`}
              >
                {wireframe ? "ON" : "OFF"}
              </button>
            </div>

            {/* Performance Mode Switch */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Low-GPU Optimization</span>
              <button
                onClick={() => setLowSpecMode((l) => !l)}
                className={`px-2 py-0.5 rounded text-[10px] border ${lowSpecMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-[#131418] text-slate-400 border-[#2a2b31]"}`}
              >
                {lowSpecMode ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            {/* Metalness Slider */}
            {!lowSpecMode && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Metalness</span>
                  <span className="text-cyan-400">{metalness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={metalness}
                  onChange={(e) => setMetalness(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            {/* Roughness Slider */}
            {!lowSpecMode && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Roughness</span>
                  <span className="text-cyan-400">{roughness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={roughness}
                  onChange={(e) => setRoughness(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            {/* Auto Rotation Slider */}
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

      {/* Bottom Left Camera Presets */}
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
