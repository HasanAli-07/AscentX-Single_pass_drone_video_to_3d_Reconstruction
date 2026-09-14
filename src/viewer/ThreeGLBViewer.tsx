import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DisplayMode, ViewToggle, Project } from "../types";
import { fetchSourceModels, fetchProjectModelInfo, SourceModelInfo } from "../services/api";

interface ThreeGLBViewerProps {
  displayMode: DisplayMode;
  activeToggles: Set<ViewToggle>;
  activeProject?: Project | null;
}

export type QualityPreset = "ULTRA_LOW" | "LOW" | "BALANCED" | "HIGH";

export function ThreeGLBViewer({ displayMode, activeToggles, activeProject }: ThreeGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedModelRef = useRef<THREE.Group | THREE.Object3D | null>(null);
  const baseScaleRef = useRef<number>(1.0);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  const [sourceModels, setSourceModels] = useState<SourceModelInfo[]>([]);
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("Reconstructed 3D Scan");
  const [loadingModel, setLoadingModel] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [modelColor, setModelColor] = useState<string>("#00c8d4");
  const [useOriginalMaterials, setUseOriginalMaterials] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [doubleSided, setDoubleSided] = useState<boolean>(true);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [showControlsPanel, setShowControlsPanel] = useState<boolean>(true);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("LOW");
  const [currentFps, setCurrentFps] = useState<number>(60);
  const [webglContextLost, setWebglContextLost] = useState<boolean>(false);
  const [modelStats, setModelStats] = useState<{ meshes: number; vertices: number; faces: number } | null>(null);
  const [maxTextureSize, setMaxTextureSize] = useState<number>(4096);
  const [autoFpsOptimize, setAutoFpsOptimize] = useState<boolean>(true);

  // Fetch available models prioritizing current active project's reconstructed video model
  useEffect(() => {
    async function loadModels() {
      const baseModels = await fetchSourceModels();
      let modelList: SourceModelInfo[] = [];

      if (activeProject) {
        const projModel = await fetchProjectModelInfo(activeProject.id, activeProject.name);
        modelList.push(projModel);
      }

      modelList = [...modelList, ...baseModels];
      setSourceModels(modelList);

      if (modelList.length > 0) {
        setSelectedModelUrl(modelList[0].download_url);
        setSelectedModelName(modelList[0].name);
      }
    }
    loadModels();
  }, [activeProject?.id, activeProject?.name, activeProject?.status]);

  // Dispose unneeded geometries, textures, materials to prevent VRAM memory leaks
  const disposeHierarchy = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const disposeMaterial = (mat: any) => {
            if (!mat) return;
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            if (mat.roughnessMap) mat.roughnessMap.dispose();
            if (mat.metalnessMap) mat.metalnessMap.dispose();
            if (mat.aoMap) mat.aoMap.dispose();
            if (mat.emissiveMap) mat.emissiveMap.dispose();
            mat.dispose();
          };

          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => disposeMaterial(m));
          } else {
            disposeMaterial(mesh.material);
          }
        }
      }
    });
  };

  // Downsample & optimize textures for Low-Spec GPUs
  const optimizeTexturesForLowConfig = (object: THREE.Object3D, isUltraLow: boolean) => {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat: any) => {
          if (!mat) return;
          const maps = [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap, mat.emissiveMap];
          maps.forEach((map) => {
            if (map) {
              map.generateMipmaps = !isUltraLow;
              map.minFilter = isUltraLow ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
              map.magFilter = THREE.LinearFilter;
              map.anisotropy = isUltraLow ? 1 : 2;
              map.needsUpdate = true;
            }
          });
        });
      }
    });
  };

  // Initialize Three.js Scene, Camera, Lights, Renderer ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d0e11");
    sceneRef.current = scene;

    // Camera with ultra-wide frustum clipping planes
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500000);
    camera.position.set(50, 40, 60);
    cameraRef.current = camera;

    // Create WebGL Renderer ONCE
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        precision: "mediump",
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
      });
    } catch (e) {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, precision: "lowp" });
    }

    renderer.setClearColor(new THREE.Color("#0d0e11"), 1.0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(1.0);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Report hardware GPU cap
    setMaxTextureSize(renderer.capabilities.maxTextureSize || 4096);
    rendererRef.current = renderer;

    const canvas = renderer.domElement;
    canvas.style.backgroundColor = "#0d0e11";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    containerRef.current.appendChild(canvas);

    // WebGL Context Loss Recovery Listeners
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL Context Lost! Initiating low-spec recovery mode...");
      setWebglContextLost(true);
    };

    const handleContextRestored = () => {
      console.log("WebGL Context Restored! Re-building 3D viewport...");
      setWebglContextLost(false);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    // Orbit Controls with expanded distance range
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 200000;
    controls.minDistance = 0.1;
    controlsRef.current = controls;

    // Multi-Directional Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    ambientLight.name = "ambientLight";
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.6);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainDirLight.position.set(200, 400, 200);
    mainDirLight.name = "mainDirLight";
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x00c8d4, 0.5);
    fillLight.position.set(-200, 200, -200);
    fillLight.name = "fillLight";
    scene.add(fillLight);

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

    // Dynamic FPS Performance Monitor Loop & Idle Render Throttling
    let reqId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      controls.update();

      if (loadedModelRef.current && rotationSpeed > 0) {
        loadedModelRef.current.rotation.y += rotationSpeed * 0.008;
      }

      // Calculate real-time FPS
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        setCurrentFps(fps);

        // Auto-switch to Low-Spec Mode if FPS drops below 25
        if (autoFpsOptimize && fps < 25 && qualityPreset !== "ULTRA_LOW") {
          console.warn(`Performance drop detected (${fps} FPS). Auto-downgrading quality preset.`);
          setQualityPreset((prev) => {
            if (prev === "HIGH") return "BALANCED";
            if (prev === "BALANCED") return "LOW";
            if (prev === "LOW") return "ULTRA_LOW";
            return prev;
          });
        }

        frameCount = 0;
        lastTime = now;
      }

      // Render scene
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
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Apply Quality Preset Updates Dynamically Without Re-creating WebGL Context
  useEffect(() => {
    if (!rendererRef.current) return;
    const isUltraLow = qualityPreset === "ULTRA_LOW";
    const isLow = qualityPreset === "LOW" || isUltraLow;
    const isHigh = qualityPreset === "HIGH";

    const pixelScale = isUltraLow ? 0.75 : isLow ? 1.0 : Math.min(window.devicePixelRatio, 1.5);
    rendererRef.current.setPixelRatio(pixelScale);
    rendererRef.current.shadowMap.enabled = isHigh;

    if (controlsRef.current) {
      controlsRef.current.enableDamping = !isUltraLow;
    }
  }, [qualityPreset]);

  // Toggle Grid / Axes
  useEffect(() => {
    if (!sceneRef.current) return;
    const grid = sceneRef.current.getObjectByName("grid");
    if (grid) grid.visible = activeToggles.has("grid");
    const axes = sceneRef.current.getObjectByName("axes");
    if (axes) axes.visible = activeToggles.has("axes");
  }, [activeToggles]);

  // Auto-Frame Camera Target on Bounding Center
  const fitCameraToModel = (object: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;

    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    if (bbox.isEmpty()) return;

    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 60;

    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraDist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5;
    cameraDist = Math.max(cameraDist, 40);

    cameraRef.current.position.set(center.x + cameraDist * 0.7, center.y + cameraDist * 0.5, center.z + cameraDist * 0.8);
    cameraRef.current.near = 0.1;
    cameraRef.current.far = 500000;
    cameraRef.current.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.maxDistance = 200000;
    controlsRef.current.minDistance = 0.1;
    controlsRef.current.update();
  };

  // Load 3D GLB / GLTF Model with Robust Scale Normalization & Fallbacks
  useEffect(() => {
    if (!sceneRef.current || !selectedModelUrl) return;

    setLoadingModel(true);
    setLoadProgress(15);
    originalMaterialsRef.current.clear();

    // Clean memory from previous model
    if (loadedModelRef.current) {
      disposeHierarchy(loadedModelRef.current);
      sceneRef.current.remove(loadedModelRef.current);
      loadedModelRef.current = null;
    }

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    loader.setDRACOLoader(dracoLoader);

    const onModelLoaded = (gltf: any) => {
      try {
        const model = gltf.scene;

        let meshCount = 0;
        let vertCount = 0;
        let faceCount = 0;

        const isUltraLow = qualityPreset === "ULTRA_LOW";

        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            meshCount++;
            mesh.frustumCulled = false; // Prevent culling errors

            mesh.castShadow = qualityPreset === "HIGH";
            mesh.receiveShadow = qualityPreset === "HIGH";

            if (mesh.geometry) {
              const pos = mesh.geometry.attributes.position;
              if (pos) vertCount += pos.count;
              if (mesh.geometry.index) {
                faceCount += mesh.geometry.index.count / 3;
              } else if (pos) {
                faceCount += pos.count / 3;
              }
            }

            originalMaterialsRef.current.set(mesh, mesh.material);

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.side = THREE.DoubleSide;
                m.needsUpdate = true;
              });
            } else if (mesh.material) {
              mesh.material.side = THREE.DoubleSide;
              mesh.material.needsUpdate = true;
            }
          }
        });

        optimizeTexturesForLowConfig(model, isUltraLow);

        setModelStats({
          meshes: meshCount,
          vertices: vertCount,
          faces: Math.round(faceCount),
        });

        // Compute original bounding box & normalize model scale to 60 units
        model.updateMatrixWorld(true);
        let scaleFactor = 1.0;
        const bbox = new THREE.Box3().setFromObject(model);
        if (!bbox.isEmpty()) {
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            scaleFactor = 60.0 / maxDim;
          }
        }

        baseScaleRef.current = scaleFactor;
        const finalScale = scaleFactor * modelScale;
        model.scale.set(finalScale, finalScale, finalScale);
        model.updateMatrixWorld(true);

        const scaledBbox = new THREE.Box3().setFromObject(model);
        const center = scaledBbox.getCenter(new THREE.Vector3());

        model.position.set(-center.x, -scaledBbox.min.y, -center.z);
        model.updateMatrixWorld(true);
        model.traverse((c: THREE.Object3D) => c.updateMatrixWorld(true));

        loadedModelRef.current = model;
        sceneRef.current?.add(model);

        fitCameraToModel(model);
      } catch (err) {
        console.error("Error configuring loaded GLTF model:", err);
      } finally {
        setLoadingModel(false);
        setLoadProgress(100);
      }
    };

    const renderProceduralFallback = () => {
      console.warn("Using procedural 3D model fallback");
      baseScaleRef.current = 1.0;

      const group = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(modelColor),
        side: THREE.DoubleSide,
      });

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
    };

    loader.load(
      selectedModelUrl,
      onModelLoaded,
      (xhr) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          setLoadProgress(Math.min(95, Math.round((xhr.loaded / xhr.total) * 100)));
        }
      },
      (err) => {
        console.warn("GLTFLoader with Draco failed, attempting plain GLTFLoader:", err);
        const plainLoader = new GLTFLoader();
        plainLoader.load(
          selectedModelUrl,
          onModelLoaded,
          undefined,
          (err2) => {
            console.error("All 3D model file loading attempts failed:", err2);
            renderProceduralFallback();
          }
        );
      }
    );
  }, [selectedModelUrl]);

  // Update Scale
  useEffect(() => {
    if (!loadedModelRef.current) return;
    const effectiveScale = baseScaleRef.current * modelScale;
    loadedModelRef.current.scale.set(effectiveScale, effectiveScale, effectiveScale);
  }, [modelScale]);

  // Update Materials & Quality Preset Shader Modes
  useEffect(() => {
    if (!loadedModelRef.current) return;
    const isUltraLow = qualityPreset === "ULTRA_LOW";
    const isLow = qualityPreset === "LOW" || isUltraLow;

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
          mesh.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color("#22c55e"),
            side: THREE.DoubleSide,
          });
        } else if (useOriginalMaterials && orig) {
          mesh.material = orig;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => (m.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide));
          } else {
            mesh.material.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
          }
        } else if (isUltraLow) {
          mesh.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(modelColor),
            side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
          });
        } else if (isLow) {
          mesh.material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(modelColor),
            side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
          });
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
  }, [modelColor, useOriginalMaterials, wireframe, doubleSided, displayMode, qualityPreset]);

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

      {/* WebGL Context Loss Banner */}
      {webglContextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0e11]/95 z-30 p-6 text-center">
          <span className="text-amber-400 text-sm font-mono font-bold mb-2">⚠️ WEBGL CONTEXT LOST DETECTED</span>
          <p className="text-slate-300 text-xs font-mono max-w-md mb-4">
            GPU memory limit reached on low configuration device. Re-initializing lightweight rendering mode...
          </p>
          <button
            onClick={() => {
              setWebglContextLost(false);
              setQualityPreset("ULTRA_LOW");
            }}
            className="px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono hover:bg-cyan-500/30 cursor-pointer"
          >
            FORCE RECOVERY (ULTRA LOW SPEC)
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0e11]/90 z-20">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-cyan-400 text-xs font-mono font-semibold">OPTIMIZING & LOADING 3D MODEL ({loadProgress}%)...</span>
          <span className="text-slate-400 text-[10px] font-mono mt-1">{selectedModelName}</span>
        </div>
      )}

      {/* Top Left Model Selector & Performance Meter */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 p-1.5 rounded bg-[#18191d]/90 border border-[#2a2b31] backdrop-blur shadow-lg">
          <span className="text-[10px] font-mono text-slate-400">ACTIVE 3D MODEL:</span>
          <select
            value={selectedModelUrl}
            onChange={(e) => {
              const chosen = sourceModels.find((m) => m.download_url === e.target.value);
              if (chosen) {
                setSelectedModelUrl(chosen.download_url);
                setSelectedModelName(chosen.name);
              }
            }}
            className="bg-[#131418] text-cyan-400 text-xs font-mono px-2 py-1 rounded border border-[#2a2b31] outline-none cursor-pointer max-w-xs truncate"
          >
            {sourceModels.map((m) => (
              <option key={m.download_url} value={m.download_url}>
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

        {/* Real-time FPS & Model Statistics Badge */}
        <div className="flex items-center gap-3 px-2.5 py-1 rounded bg-[#18191d]/90 border border-[#2a2b31] text-[9px] font-mono text-slate-400 backdrop-blur w-fit shadow-md">
          <span className="text-cyan-400 font-bold">{selectedModelName}</span>
          <span>FPS: <strong className={currentFps < 30 ? "text-amber-400 font-bold" : "text-emerald-400"}>{currentFps}</strong></span>
          {modelStats && (
            <>
              <span>VERTS: <strong className="text-emerald-400">{modelStats.vertices.toLocaleString()}</strong></span>
              <span>FACES: <strong className="text-indigo-400">{modelStats.faces.toLocaleString()}</strong></span>
            </>
          )}
          <span>MAX TEX: <strong className="text-cyan-400">{maxTextureSize}px</strong></span>
        </div>
      </div>

      {/* Top Right Customization & Performance Panel */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        <button
          onClick={() => setShowControlsPanel((p) => !p)}
          className="px-3 py-1.5 rounded bg-[#18191d]/90 text-cyan-400 border border-[#2a2b31] text-[10px] font-mono backdrop-blur hover:bg-[#1f2025] transition-colors cursor-pointer shadow-lg"
        >
          {showControlsPanel ? "HIDE CUSTOMIZER" : "CUSTOMIZE 3D MODEL"}
        </button>

        {showControlsPanel && (
          <div className="w-72 p-3 rounded-lg bg-[#18191d]/95 border border-[#2a2b31] shadow-2xl flex flex-col gap-3 backdrop-blur text-xs font-mono">
            <div className="text-[10px] text-slate-400 border-b border-[#2a2b31] pb-1 font-semibold flex justify-between items-center">
              <span>3D RENDER OPTIMIZER</span>
              <span className="text-cyan-400 text-[9px]">{qualityPreset.replace("_", " ")}</span>
            </div>

            {/* Performance Quality Preset Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[10px]">Render Quality Mode</span>
              <div className="grid grid-cols-2 gap-1">
                {(["ULTRA_LOW", "LOW", "BALANCED", "HIGH"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQualityPreset(q)}
                    className={`py-1 px-1.5 rounded text-[9px] border transition-colors cursor-pointer text-center ${
                      qualityPreset === q
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-semibold"
                        : "bg-[#131418] text-slate-400 border-[#2a2b31] hover:text-slate-200"
                    }`}
                  >
                    {q === "ULTRA_LOW" ? "⚡ ULTRA LOW" : q === "LOW" ? "🔋 LOW GPU" : q === "BALANCED" ? "⚖️ BALANCED" : "✨ HIGH PBR"}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto FPS Adaptivity Toggle */}
            <div className="flex justify-between items-center bg-[#131418] p-1.5 rounded border border-[#2a2b31]">
              <span className="text-slate-300 text-[10px]">Auto FPS Adaptivity</span>
              <button
                onClick={() => setAutoFpsOptimize((a) => !a)}
                className={`px-2 py-0.5 rounded text-[9px] border ${
                  autoFpsOptimize ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-[#18191d] text-slate-400 border-[#2a2b31]"
                }`}
              >
                {autoFpsOptimize ? "AUTO OPTIMIZE" : "MANUAL"}
              </button>
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
