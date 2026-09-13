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
  const [metalness, setMetalness] = useState<number>(0.2);
  const [roughness, setRoughness] = useState<number>(0.5);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(true);

  // Load available models list
  useEffect(() => {
    fetchSourceModels().then((models) => {
      setSourceModels(models);
      if (models.length > 0) setSelectedModel(models[0].filename);
    });
  }, []);

  // Initialize Three.js Scene, Camera, Lights, Grid
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d0e11");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(30, 40, 50);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00c8d4, 2.5);
    dirLight1.position.set(50, 100, 50);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3d7fff, 1.5);
    dirLight2.position.set(-50, -50, -50);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 300);
    pointLight.position.set(0, 30, 0);
    scene.add(pointLight);

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

    // Animation Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      if (loadedModelRef.current && rotationSpeed > 0) {
        loadedModelRef.current.rotation.y += rotationSpeed * 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
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
  }, []);

  // Update Toggles Visibility (Grid, Axes)
  useEffect(() => {
    if (!sceneRef.current) return;
    const grid = sceneRef.current.getObjectByName("grid");
    if (grid) grid.visible = activeToggles.has("grid");
    const axes = sceneRef.current.getObjectByName("axes");
    if (axes) axes.visible = activeToggles.has("axes");
  }, [activeToggles]);

  // Load 3D GLB Model from Projects/source
  useEffect(() => {
    if (!sceneRef.current || !selectedModel) return;

    setLoadingModel(true);
    setLoadProgress(10);

    // Remove existing model
    if (loadedModelRef.current) {
      sceneRef.current.remove(loadedModelRef.current);
      loadedModelRef.current = null;
    }

    const loader = new GLTFLoader();
    const modelUrl = `http://localhost:8000/api/v1/source-models/${selectedModel}`;

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        loadedModelRef.current = model;

        // Auto-center and fit model inside viewport bounding radius
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 10;

        model.position.sub(center); // center model
        model.position.y += size.y / 2; // place on ground grid

        const targetScale = 40 / maxDim;
        model.scale.set(targetScale, targetScale, targetScale);

        // Apply display mode & materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (displayMode === "WIRE" || wireframe) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(modelColor),
                wireframe: true,
              });
            } else if (displayMode === "CONFIDENCE") {
              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#22c55e"),
                roughness: 0.3,
                metalness: 0.1,
              });
            }
          }
        });

        sceneRef.current?.add(model);
        setLoadingModel(false);
        setLoadProgress(100);

        // Adjust camera controls to target center
        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.target.set(0, 10, 0);
          cameraRef.current.position.set(35, 30, 45);
          controlsRef.current.update();
        }
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          setLoadProgress(pct);
        }
      },
      (error) => {
        console.warn("Could not load GLB directly from backend server, building procedural 3D model geometry fallback:", error);
        setLoadingModel(false);

        // Build 3D parametric building fallback model
        const group = new THREE.Group();
        const geometry = new THREE.BoxGeometry(20, 40, 15);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          wireframe: displayMode === "WIRE" || wireframe,
          metalness: metalness,
          roughness: roughness,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 20;
        group.add(mesh);

        loadedModelRef.current = group;
        sceneRef.current?.add(group);
      }
    );
  }, [selectedModel, displayMode, wireframe]);

  // Update customization properties (Color, Metalness, Roughness, Wireframe)
  useEffect(() => {
    if (!loadedModelRef.current) return;
    loadedModelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).color) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.wireframe = displayMode === "WIRE" || wireframe;
          if (displayMode !== "CONFIDENCE") {
            mat.color.set(modelColor);
            mat.metalness = metalness;
            mat.roughness = roughness;
          }
        }
      }
    });
  }, [modelColor, metalness, roughness, wireframe, displayMode]);

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
    <div className="relative w-full h-full flex flex-col bg-[#0d0e11] overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-cyan-400 text-xs font-mono">LOADING REAL 3D MODEL ({loadProgress}%)...</span>
          <span className="text-slate-500 text-[10px] font-mono mt-1">Projects/source/Untitled.glb (63.2 MB)</span>
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
            <div className="text-[10px] text-slate-400 border-b border-[#2a2b31] pb-1 font-semibold">3D MATERIAL & RENDER CUSTOMIZER</div>

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

            {/* Metalness Slider */}
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

            {/* Roughness Slider */}
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
