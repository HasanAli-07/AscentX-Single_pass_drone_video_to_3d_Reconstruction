import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DisplayMode, ViewToggle, Project } from "../types";
import { fetchSourceModels, fetchProjectModelInfo, SourceModelInfo } from "../services/api";
import { IconTarget, IconAlertTriangle, IconZap, IconBattery, IconScale, IconSparkles, IconSliders } from "../components/Icons";

interface ThreeGLBViewerProps {
  displayMode: DisplayMode;
  activeToggles: Set<ViewToggle>;
  activeProject?: Project | null;
  theme?: "dark" | "light";
}

export type QualityPreset = "ULTRA_LOW" | "LOW" | "BALANCED" | "HIGH";

export function ThreeGLBViewer({ displayMode, activeToggles, activeProject, theme = "dark" }: ThreeGLBViewerProps) {
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
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("BALANCED");
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
        const nextUrl = modelList[0].download_url;
        setSelectedModelUrl((current) => {
          if (!current || current.split("?")[0] !== nextUrl.split("?")[0]) {
            return nextUrl;
          }
          return current;
        });
        setSelectedModelName(modelList[0].name);
      }
    }
    loadModels();
  }, [activeProject?.id, activeProject?.name]);

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
              map.generateMipmaps = true;
              map.minFilter = THREE.LinearMipmapLinearFilter;
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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 20000);
    camera.position.set(50, 40, 60);
    cameraRef.current = camera;

    // Create WebGL Renderer ONCE
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        precision: "highp",
        stencil: false,
        depth: true,
        preserveDrawingBuffer: true,
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    ambientLight.name = "ambientLight";
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainDirLight.position.set(200, 400, 200);
    mainDirLight.name = "mainDirLight";
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x00c8d4, 0.6);
    fillLight.position.set(-200, 200, -200);
    fillLight.name = "fillLight";
    scene.add(fillLight);

    // Camera-attached headlight (shines wherever camera points)
    const cameraHeadlight = new THREE.DirectionalLight(0xffffff, 1.0);
    cameraHeadlight.position.set(0, 0, 1);
    camera.add(cameraHeadlight);
    scene.add(camera);

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

  // Dynamic Theme Background & Grid Update
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;
    const isLight = theme === "light";
    const bgHex = isLight ? 0xf1f5f9 : 0x0d0e11;
    const gridPrimary = isLight ? 0x0284c7 : 0x00c8d4;
    const gridSecondary = isLight ? 0xcbd5e1 : 0x1c1e24;

    sceneRef.current.background = new THREE.Color(bgHex);
    rendererRef.current.setClearColor(new THREE.Color(bgHex), 1.0);

    if (rendererRef.current.domElement) {
      rendererRef.current.domElement.style.backgroundColor = isLight ? "#f1f5f9" : "#0d0e11";
    }

    const oldGrid = sceneRef.current.getObjectByName("grid");
    if (oldGrid) {
      sceneRef.current.remove(oldGrid);
      const newGrid = new THREE.GridHelper(300, 60, gridPrimary, gridSecondary);
      newGrid.position.y = -0.1;
      newGrid.name = "grid";
      newGrid.visible = activeToggles.has("grid");
      sceneRef.current.add(newGrid);
    }
  }, [theme, activeToggles]);

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
    let cameraDist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 0.85;
    cameraDist = Math.max(cameraDist, 25);

    cameraRef.current.position.set(center.x + cameraDist * 0.75, center.y + cameraDist * 0.55, center.z + cameraDist * 0.85);
    cameraRef.current.near = 0.5;
    cameraRef.current.far = 20000;
    cameraRef.current.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.maxDistance = 10000;
    controlsRef.current.minDistance = 0.5;
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

            const gltfMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            let finalMat: THREE.Material;

            if (gltfMat && (gltfMat as any).isMaterial) {
              const mat = gltfMat as any;
              mat.side = THREE.DoubleSide;
              mat.wireframe = false;
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
                mat.map.wrapS = THREE.RepeatWrapping;
                mat.map.wrapT = THREE.RepeatWrapping;
                mat.map.needsUpdate = true;
              }
              if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                mat.roughness = 0.4;
                mat.metalness = 0.1;
              }
              mat.needsUpdate = true;
              finalMat = mat;
            } else {
              finalMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(modelColor),
                side: THREE.DoubleSide,
                roughness: 0.4,
                metalness: 0.1,
              });
            }

            mesh.material = finalMat;
            originalMaterialsRef.current.set(mesh, finalMat);
          }
        });

        optimizeTexturesForLowConfig(model, isUltraLow);

        setModelStats({
          meshes: meshCount,
          vertices: vertCount,
          faces: Math.round(faceCount),
        });

        // Remove any stale wrapper groups
        const oldWrapper = sceneRef.current?.getObjectByName("ModelWrapperGroup");
        if (oldWrapper) {
          disposeHierarchy(oldWrapper);
          sceneRef.current?.remove(oldWrapper);
        }

        // Wrap model in container Group for rock-solid centering & scaling
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        let scaleFactor = 1.0;

        if (!bbox.isEmpty()) {
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            scaleFactor = 60.0 / maxDim;
          }
          // Center model inside local wrapper space
          model.position.set(-center.x, -bbox.min.y, -center.z);
        }

        baseScaleRef.current = scaleFactor;
        const wrapper = new THREE.Group();
        wrapper.name = "ModelWrapperGroup";
        wrapper.add(model);

        const initialScale = scaleFactor * modelScale;
        wrapper.scale.set(initialScale, initialScale, initialScale);
        wrapper.updateMatrixWorld(true);

        loadedModelRef.current = wrapper;
        sceneRef.current?.add(wrapper);

        fitCameraToModel(wrapper);
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
        } else if (displayMode === "SOLID") {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(modelColor),
            side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            roughness: 0.4,
            metalness: 0.2,
          });
        } else if (useOriginalMaterials && orig) {
          mesh.material = orig;
          const materials = Array.isArray(orig) ? orig : [orig];
          materials.forEach((mat: any) => {
            if (mat) {
              mat.wireframe = wireframe;
              mat.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
              mat.needsUpdate = true;
            }
          });
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
    <div className="relative w-full h-full flex flex-col overflow-hidden transition-colors" style={{ background: "var(--color-bg)" }}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ background: "var(--color-bg)" }} />

      {/* WebGL Context Loss Banner */}
      {webglContextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 p-6 text-center backdrop-blur" style={{ background: "var(--color-bg)" }}>
          <span className="text-amber-500 text-sm font-mono font-bold mb-2 flex items-center gap-1.5">
            <IconAlertTriangle size={16} />
            <span>WEBGL CONTEXT LOST DETECTED</span>
          </span>
          <p className="text-xs font-mono max-w-md mb-4" style={{ color: "var(--color-text-muted)" }}>
            GPU memory limit reached on low configuration device. Re-initializing lightweight rendering mode...
          </p>
          <button
            onClick={() => {
              setWebglContextLost(false);
              setQualityPreset("ULTRA_LOW");
            }}
            className="px-4 py-2 rounded text-xs font-mono cursor-pointer flex items-center gap-1"
            style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
          >
            <IconZap size={13} />
            <span>FORCE RECOVERY (ULTRA LOW SPEC)</span>
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur" style={{ background: "var(--color-bg)" }}>
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: "var(--color-cyan)", borderTopColor: "transparent" }} />
          <span className="text-xs font-mono font-semibold" style={{ color: "var(--color-cyan)" }}>OPTIMIZING & LOADING 3D MODEL ({loadProgress}%)...</span>
          <span className="text-[10px] font-mono mt-1" style={{ color: "var(--color-text-muted)" }}>{selectedModelName}</span>
        </div>
      )}

      {/* Top Left Model Selector & Performance Meter */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-[calc(100vw-1.5rem)]">
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded backdrop-blur shadow-lg border" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}>
          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "var(--color-text-muted)" }}>ACTIVE 3D MODEL:</span>
          <select
            value={selectedModelUrl}
            onChange={(e) => {
              const chosen = sourceModels.find((m) => m.download_url === e.target.value);
              if (chosen) {
                setSelectedModelUrl(chosen.download_url);
                setSelectedModelName(chosen.name);
              }
            }}
            className="text-xs font-mono px-2 py-1 rounded border outline-none cursor-pointer max-w-[160px] sm:max-w-xs truncate"
            style={{ background: "var(--color-input-bg)", color: "var(--color-cyan)", borderColor: "var(--color-border)" }}
          >
            {sourceModels.map((m) => (
              <option key={m.download_url} value={m.download_url}>
                {m.name} ({m.size_mb} MB)
              </option>
            ))}
          </select>

          <button
            onClick={() => loadedModelRef.current && fitCameraToModel(loadedModelRef.current)}
            className="px-2.5 py-1 rounded text-[9px] font-mono transition-colors cursor-pointer flex items-center gap-1"
            style={{ background: "var(--color-cyan-dim)", color: "var(--color-cyan)", border: "1px solid var(--color-cyan)" }}
          >
            <IconTarget size={11} />
            <span>FIT TO SCREEN</span>
          </button>
        </div>

        {/* Real-time FPS & Model Statistics Badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-2.5 py-1 rounded border text-[9px] font-mono backdrop-blur w-fit shadow-md" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
          <span className="font-bold truncate max-w-[120px] sm:max-w-none" style={{ color: "var(--color-cyan)" }}>{selectedModelName}</span>
          <span>FPS: <strong className={currentFps < 30 ? "text-amber-500 font-bold" : "text-emerald-500"}>{currentFps}</strong></span>
          {modelStats && (
            <>
              <span className="hidden sm:inline">VERTS: <strong className="text-emerald-500">{modelStats.vertices.toLocaleString()}</strong></span>
              <span className="hidden sm:inline">FACES: <strong className="text-indigo-500">{modelStats.faces.toLocaleString()}</strong></span>
            </>
          )}
          <span>MAX TEX: <strong style={{ color: "var(--color-cyan)" }}>{maxTextureSize}px</strong></span>
        </div>
      </div>

      {/* Top Right Customization & Performance Panel */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        <button
          onClick={() => setShowControlsPanel((p) => !p)}
          className="px-3 py-1.5 rounded text-[10px] font-mono backdrop-blur transition-colors cursor-pointer shadow-lg flex items-center gap-1.5"
          style={{ background: "var(--color-card-bg)", color: "var(--color-cyan)", border: "1px solid var(--color-border)" }}
        >
          <IconSliders size={12} />
          <span>{showControlsPanel ? "HIDE CUSTOMIZER" : "CUSTOMIZE 3D MODEL"}</span>
        </button>

        {showControlsPanel && (
          <div className="w-64 sm:w-72 p-3 rounded-lg border shadow-2xl flex flex-col gap-3 backdrop-blur text-xs font-mono max-h-[80vh] overflow-y-auto" style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}>
            <div className="text-[10px] border-b pb-1 font-semibold flex justify-between items-center" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-subtle)" }}>
              <span>3D RENDER OPTIMIZER</span>
              <span className="text-[9px]" style={{ color: "var(--color-cyan)" }}>{qualityPreset.replace("_", " ")}</span>
            </div>

            {/* Performance Quality Preset Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Render Quality Mode</span>
              <div className="grid grid-cols-2 gap-1">
                {(["ULTRA_LOW", "LOW", "BALANCED", "HIGH"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQualityPreset(q)}
                    className={`py-1 px-1.5 rounded text-[9px] border transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
                      qualityPreset === q
                        ? "font-semibold"
                        : "hover:opacity-80"
                    }`}
                    style={{
                      background: qualityPreset === q ? "var(--color-cyan-dim)" : "var(--color-input-bg)",
                      color: qualityPreset === q ? "var(--color-cyan)" : "var(--color-text-muted)",
                      borderColor: qualityPreset === q ? "var(--color-cyan)" : "var(--color-border)",
                    }}
                  >
                    {q === "ULTRA_LOW" && <IconZap size={10} />}
                    {q === "LOW" && <IconBattery size={10} />}
                    {q === "BALANCED" && <IconScale size={10} />}
                    {q === "HIGH" && <IconSparkles size={10} />}
                    <span>{q === "ULTRA_LOW" ? "ULTRA LOW" : q === "LOW" ? "LOW GPU" : q === "BALANCED" ? "BALANCED" : "HIGH PBR"}</span>
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
