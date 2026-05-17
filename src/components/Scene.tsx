import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  ContactShadows,
  Environment,
  Stars,
} from "@react-three/drei";
import { XR, XROrigin } from "@react-three/xr";

function Locomotion() {
  const originRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  useFrame((_, delta) => {
    const locomotionMode = useLegoStore.getState().locomotionMode;
    if (locomotionMode !== "Smooth") return;

    const session = gl.xr.getSession();
    if (!session || !originRef.current) return;

    const inputSources = Array.from(session.inputSources);
    const leftInput = inputSources.find((s) => s.handedness === "left");

    if (leftInput && leftInput.gamepad) {
      const axes = leftInput.gamepad.axes;
      // Quest mapping: axis 2 = X, axis 3 = Y (xr-standard)
      // Fallback for some profiles: axis 0 is X, axis 1 is Y
      const x = axes[2] ?? axes[0] ?? 0;
      const y = axes[3] ?? axes[1] ?? 0;

      if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
        // Headset-yaw relative movement
        const headsetDir = new THREE.Vector3();
        camera.getWorldDirection(headsetDir);
        headsetDir.y = 0; // No vertical movement
        headsetDir.normalize();

        const headsetRight = new THREE.Vector3();
        headsetRight.crossVectors(headsetDir, new THREE.Vector3(0, 1, 0));

        const speed = 2.0;
        const moveVec = new THREE.Vector3();
        // Forward is -Y on the stick in WebXR gamepad mapping
        moveVec.addScaledVector(headsetDir, -y * speed * delta);
        moveVec.addScaledVector(headsetRight, x * speed * delta);

        originRef.current.position.add(moveVec);
      }
    }
  });

  return <XROrigin ref={originRef} position={[0, 0, 1.0]} />;
}
import * as THREE from "three";
import { LegoBrick } from "./LegoBrick";
import { BrickInstances } from "./BrickInstances";

const isQuest =
  typeof navigator !== "undefined" &&
  /Quest|OculusBrowser/i.test(navigator.userAgent);

import {
  useLegoStore,
  checkPlacementValid,
  checkStructureValid,
  getBrickDimensions,
  getPresetInfo,
  PRESETS,
  isValidBrickData,
  getActivePresetBricks,
  BrickData,
  getGroupBricks,
  LEGO_COLORS,
  getBrickAABB,
  doAABBsOverlap,
  hasBrickAbove,
} from "../Store";

import {
  MODULE_SIZE,
  BRICK_HEIGHT,
} from "../constants";

import { VRRadialMenu } from "./VRRadialMenu";
import { VRPalette } from "./VRPalette";
import { vrTargetManager } from "../lib/vrTargets";
import { isQuestControllerReady } from "../lib/vrHelpers";
import { clientToCanvasNDC } from "../lib/pointer";

import { HumanViewLayer } from "./VRViewLayers";
import { VRStats } from "./VRStats";
import { VROnboarding } from "./VROnboarding";
import { VRWaitingPanel } from "./VRWaitingPanel";

export type VRScaleMode = "human";

const VR_SCALE_VALUES: Record<VRScaleMode, number> = {
  human: 1.0,
};

const VRDebugVisibilityLayer = () => {
  const isDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugXR") === "1";
  if (!isDebug) return null;
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1, -2]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial color="#00ff00" wireframe={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="#333333" wireframe={true} />
      </mesh>
      <group position={[0, 1.5, -2]}>
        <mesh>
          <planeGeometry args={[1, 0.2]} />
          <meshBasicMaterial color="black" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
};

const SceneContents = ({ xrStore }: { xrStore?: any }) => {
  const { gl, scene, camera } = useThree();
  const [vrScale, setVrScale] = useState<VRScaleMode>("human");
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [xrSessionActive, setXrSessionActive] = useState(false);
  const [vrReady, setVrReady] = useState(true);
  const [clipboard, setClipboard] = useState<BrickData[]>([]);
  // 14. Remove <Canvas preserveDrawingBuffer={true}> in App.tsx. This causes massive memory/performance drags in WebGL.
  // We'll also disable shadow map completely in XR to save on draw calls.
  useEffect(() => {
    gl.shadowMap.enabled = !xrSessionActive;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as any).material) {
        let mat = (child as any).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            m.needsUpdate = true;
          });
        } else {
          mat.needsUpdate = true;
        }
      }
    });
  }, [xrSessionActive, gl, scene]);

  const [marqueeStart, setMarqueeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const currentVRScale = xrSessionActive ? VR_SCALE_VALUES[vrScale] : 1.0;

  useEffect(() => {
    if (!xrStore) return;
    return xrStore.subscribe((state: any) => {
      const active = !!state.session;
      setXrSessionActive(active);
      if (!active) {
        setVrScale("human");
        setVrReady(true);
        useLegoStore.getState().closeXRPanel();
      } else {
        setVrReady(false);
        useLegoStore.getState().setXRPanel("waitingControllers");
      }
    });
  }, [xrStore, gl]);

  useEffect(() => {
    if (!xrSessionActive) return;
    const session = gl.xr.getSession();
    if (!session) return;

    const handleVisibility = (e: any) => {
      if (e.session && e.session.visibilityState === "visible") {
        import("../services/AudioService").then((m) => m.audioService.resume());
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        if (useLegoStore.getState().xrPanel === "waitingControllers") {
          useLegoStore.getState().setToastMessage("XR Resumed");
          setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
        }
      }
    };

    const docVis = () => {
      if (document.visibilityState === "visible") {
        import("../services/AudioService").then((m) => m.audioService.resume());
      }
    };

    session.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("visibilitychange", docVis);

    return () => {
      session.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("visibilitychange", docVis);
    };
  }, [gl, xrSessionActive]);

  useEffect(() => {
    if (xrSessionActive) {
      let rafId: number;

      const checkReady = async () => {
        // Compile scene to reduce shader stutter
        try {
          gl.compile(scene, camera);
        } catch (e) {
          console.warn("[BrickXR] VR shader pre-compile warning:", e);
        }

        const targets = vrTargetManager.getValidTargets();
        const hasGrid = targets.some((t) => t.name === "Grid");

        let hasTrackedController = false;
        try {
          const sess = gl.xr.getSession();
          if (sess) {
            hasTrackedController = Array.from(sess.inputSources).some(
              (source) => isQuestControllerReady(source),
            );
          }
        } catch (e) {}

        // Removed the fake 3000ms readiness timeout. Wait until conditions are actually met.
        if (hasGrid && hasTrackedController) {
          try {
            await teleportPlayer({ x: 0, y: 0, z: -1.0 });
            setVrReady(true);
            const store = useLegoStore.getState();
            if (store.xrPanel === "waitingControllers") {
              store.setXRPanel("onboarding");
            }
            if ((import.meta as any).env.DEV)
              console.log("[VR] Status: VR ready");
          } catch (e) {
            // Wait longer if ref space request failed temporarily
            rafId = requestAnimationFrame(checkReady);
          }
        } else {
          rafId = requestAnimationFrame(checkReady);
        }
      };

      checkReady();
      return () => cancelAnimationFrame(rafId);
    }
  }, [xrSessionActive, gl, scene, camera]);

  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);
  const cameraMode = useLegoStore((state) => state.cameraMode);
  const selectedType = useLegoStore((state) => state.selectedType);
  const selectedColor = useLegoStore((state) => state.selectedColor);
  const addBrick = useLegoStore((state) => state.addBrick);
  const lastPlacementRef = useRef(0);
  const activePreset = useLegoStore((state) => state.activePreset);
  const commitPreset = useLegoStore((state) => state.commitPreset);
  const movingBrickId = useLegoStore((state) => state.movingBrickId);
  const setMovingBrickId = useLegoStore((state) => state.setMovingBrickId);
  const isDraggingBrick = useLegoStore((state) => state.isDraggingBrick);
  const setIsDraggingBrick = useLegoStore((state) => state.setIsDraggingBrick);
  const selectionMode = useLegoStore((state) => state.selectionMode);
  const showXRPerf = useLegoStore((state) => state.showXRPerf);
  const xrPanel = useLegoStore((state) => state.xrPanel);

  const multiSelectedBrickIds = useLegoStore(
    (state) => state.multiSelectedBrickIds,
  );
  const isCameraLocked = useLegoStore((state) => state.isCameraLocked);

  const controlsRef = useRef<any>(null);
  const exportGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    useLegoStore.getState().setExportGLB(() => {
      if (exportGroupRef.current) {
        import("three/examples/jsm/exporters/GLTFExporter.js").then(
          ({ GLTFExporter }) => {
            const exporter = new GLTFExporter();
            exporter.parse(
              exportGroupRef.current!,
              (gltf: any) => {
                const blob = new Blob([gltf], {
                  type: "application/octet-stream",
                });
                let canUsePicker = false;
                if ("showSaveFilePicker" in window) {
                  try {
                    canUsePicker = window.self === window.top;
                  } catch (e) {
                    canUsePicker = false;
                  }
                }
                if (canUsePicker) {
                  (window as any)
                    .showSaveFilePicker({
                      suggestedName: "brick-structure.glb",
                      types: [
                        {
                          description: "GLB Files",
                          accept: { "model/gltf-binary": [".glb"] },
                        },
                      ],
                    })
                    .then((handle: any) => handle.createWritable())
                    .then((writable: any) =>
                      writable.write(blob).then(() => {
                        writable.close();
                        useLegoStore
                          .getState()
                          .setToastMessage("Exported GLB successfully.");
                      }),
                    )
                    .catch((e: any) => {
                      if (e.name !== "AbortError") console.error(e);
                    });
                } else {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "brick-structure.glb";
                  a.click();
                  URL.revokeObjectURL(url);
                  useLegoStore
                    .getState()
                    .setToastMessage("Exported GLB successfully.");
                }
              },
              (error) => {
                console.error("An error happened during GLB export", error);
                useLegoStore.getState().setToastMessage("Error exporting GLB.");
              },
              { binary: true },
            );
          },
        );
      }
    });
    return () => useLegoStore.getState().setExportGLB(null);
  }, []);

  const isBrickInteractionRef = useRef(false);
  type PlacementCandidate = {
    hit: {
      point: THREE.Vector3;
      normal: THREE.Vector3;
      object: THREE.Object3D;
      hitPoint: THREE.Vector3;
      targetKind: string;
      instanceId?: number;
    };
    position: [number, number, number];
  };

  const interactionStartCandidateRef = useRef<PlacementCandidate | null>(null);
  const latestPlacementCandidateRef = useRef<PlacementCandidate | null>(null);

  const handlePointerUpRef = useRef<any>(null);

  const executeCommitRef = useRef<any>(null);

  useEffect(() => {
    handlePointerUpRef.current = handlePointerUp;
    // We update executeCommitRef when we render, but the function isn't defined yet! It's defined at line 817.
    // It's hoisted or we can just keep executeCommitRef and update it right after executeCommit is defined later down.
  });

  const handleVRCommit = (
    point: THREE.Vector3,
    normal: THREE.Vector3,
    targetKind: string,
  ) => {
    pointerDownPos.current = null;
    const state = useLegoStore.getState();
    if (executeCommitRef.current) {
      let position = computePlacementTarget(point, normal, targetKind);

      let finalTargetKind = targetKind;
      if (
        state.mode === "Move" &&
        state.movingBrickId &&
        !state.isDraggingBrick
      ) {
        finalTargetKind = "rotation-only";
      }

      return executeCommitRef.current({
        hit: {
          point,
          normal,
          object: undefined as any,
          hitPoint: point,
          targetKind: finalTargetKind,
        },
        position,
      });
    }
    return false;
  };

  const vrRecenterTrigger = useLegoStore((s) => s.vrRecenterTrigger);

  useEffect(() => {
    if (vrRecenterTrigger === 0) return;
    // local-floor includes eye height automatically, so Y should be 0.
    teleportPlayer({ x: 0, y: 0, z: -1.0 });
  }, [vrRecenterTrigger]);

  useFrame((state) => {
    if (controlsRef.current) {
      if (isCameraLocked || isVR || xrSessionActive || gl.xr.isPresenting) {
        controlsRef.current.enabled = false;
      } else {
        controlsRef.current.enabled =
          !isBrickInteractionRef.current && !isDraggingBrick && !marqueeStart;
      }
      if (
        controlsRef.current.target.y < 0 &&
        !xrSessionActive &&
        !gl.xr.isPresenting
      ) {
        controlsRef.current.target.y = 0;
      }
      if (
        state.camera.position.y < 0.1 &&
        !xrSessionActive &&
        !gl.xr.isPresenting
      ) {
        state.camera.position.y = 0.1;
      }
    }
  });

  const screenshotTrigger = useLegoStore((s) => s.screenshotTrigger);

  useEffect(() => {
    if (screenshotTrigger === 0) return;
    setIsScreenshotting(true);
    setTimeout(() => {
      try {
        // Must render first to ensure canvas has content
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = "brickxr-screenshot.png";
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.warn("[BrickXR] Screenshot capture failed:", err);
        useLegoStore
          .getState()
          .setToastMessage(
            "Screenshot capture may be unavailable on some browsers.",
          );
      } finally {
        setIsScreenshotting(false);
      }
    }, 50);
  }, [screenshotTrigger, gl, scene, camera]);

  const movingBrick = useMemo(() => {
    return bricks.find((b) => b.id === movingBrickId) || null;
  }, [bricks, movingBrickId]);

  const movingGroupOriginalBricks = useMemo(() => {
    if (selectionMode === "Multi") {
      return bricks.filter((b) => multiSelectedBrickIds.includes(b.id));
    }
    if (!movingBrick) return [];
    if (selectionMode === "Solo") return [movingBrick];
    return getGroupBricks(movingBrick, bricks);
  }, [movingBrick, bricks, selectionMode, multiSelectedBrickIds]);

  const movingGroupPivot = useMemo(() => {
    if (movingGroupOriginalBricks.length === 0) return [0, 0, 0];
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    let minY = Infinity;
    movingGroupOriginalBricks.forEach((b) => {
      const dim = getBrickDimensions(b.type as any);
      const rot = (b.rotation || 0) % 360;
      const w = rot === 90 || rot === 270 ? dim.d : dim.w;
      const d = rot === 90 || rot === 270 ? dim.w : dim.d;
      minX = Math.min(minX, b.position[0]);
      maxX = Math.max(maxX, b.position[0] + w * 0.08);
      minZ = Math.min(minZ, b.position[2]);
      maxZ = Math.max(maxZ, b.position[2] + d * 0.08);
      minY = Math.min(minY, b.position[1]);
    });

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    return [cx, minY, cz];
  }, [movingGroupOriginalBricks]);

  const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [ghostRotation, setGhostRotation] = useState<number>(0);

  const ghostPosTrigger = useLegoStore((s) => s.ghostPosTrigger);
  const ghostPosData = useLegoStore((s) => s.ghostPosData);

  useEffect(() => {
    if (ghostPosTrigger === 0 || !ghostPosData) return;
    setGhostPosition(ghostPosData);
  }, [ghostPosTrigger, ghostPosData]);

  const sceneGroupRef = useRef<THREE.Group>(null);

  async function teleportPlayer(offsetPosition: {
    x: number;
    y: number;
    z: number;
  }) {
    if (!gl.xr.isPresenting) return;
    const session = gl.xr.getSession();
    if (!session) return;
    try {
      if (typeof XRRigidTransform === "undefined") return;

      let refSpace: XRReferenceSpace | null = null;
      let refSpaceType = "";
      const spaceTypes: XRReferenceSpaceType[] = [
        "local-floor",
        "local",
        "viewer",
      ];

      for (const spaceType of spaceTypes) {
        try {
          refSpace = await session.requestReferenceSpace(spaceType);
          refSpaceType = spaceType;
          break; // success
        } catch (e) {
          if ((import.meta as any).env.DEV)
            console.log(`[VR] requestReferenceSpace('${spaceType}') failed`);
        }
      }

      if (!refSpace) throw new Error("No usable reference space found");
      if ((import.meta as any).env.DEV)
        console.log(`[VR] Selected reference space: ${refSpaceType}`);

      const transform = new XRRigidTransform(offsetPosition, {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      });
      gl.xr.setReferenceSpace(refSpace.getOffsetReferenceSpace(transform));
      // Teleport success
    } catch (err) {
      console.warn("Teleport failed", err);
      throw err;
    }
  }

  const toggleScale = () => {
    // Disabled until Micro mode has interaction
  };

  const rotateGhostTrigger = useLegoStore((state) => state.rotateGhostTrigger);

  useEffect(() => {
    if (rotateGhostTrigger > 0) {
      setGhostRotation((r) => (r + 90) % 360);
    }
  }, [rotateGhostTrigger]);

  const ghostRotTrigger = useLegoStore((s) => s.ghostRotTrigger);
  const ghostRotData = useLegoStore((s) => s.ghostRotData);

  useEffect(() => {
    if (ghostRotTrigger === 0 || ghostRotData === null) return;
    setGhostRotation(ghostRotData);
  }, [ghostRotTrigger, ghostRotData]);

  const snapToGrid = (val: number, step: number) =>
    Math.round(val / step) * step;

  const getBrickWorldDimensions = (type: string, rotation: number) => {
    const { w, d } = getBrickDimensions(type as any);
    const rot = Math.round(rotation / 90) % 4;
    const isRot = rot === 1 || rot === 3 || rot === -1 || rot === -3;
    const effW = isRot ? d : w;
    const effD = isRot ? w : d;
    return {
      widthX: effW * MODULE_SIZE,
      depthZ: effD * MODULE_SIZE,
    };
  };

  const computePlacementTarget = (
    point: THREE.Vector3,
    normal: THREE.Vector3,
    targetKind: string = "none",
  ): [number, number, number] => {
    let w = 1,
      d = 1;
    const activeType = activePreset
      ? "1x1"
      : movingBrick
        ? movingBrick.type
        : selectedType;

    if (activePreset) {
      const info = getPresetInfo(activePreset, clipboard);
      w = info.w;
      d = info.d;
    } else {
      const dims = getBrickDimensions(activeType as any);
      w = dims.w;
      d = dims.d;
    }

    const rot = Math.round(ghostRotation / 90) % 4;
    const isRot = rot === 1 || rot === 3 || rot === -1 || rot === -3;
    const effW = isRot ? d : w;
    const effD = isRot ? w : d;

    const alignSnap = (
      val: number,
      count: number,
      step: number,
      currentPos: number | null,
    ) => {
      const offset = count % 2 === 1 ? step / 2 : 0;
      const rawSnap = Math.round((val - offset) / step) * step + offset;

      if (currentPos !== null) {
        const isAligned =
          Math.abs(
            (currentPos - offset) / step -
              Math.round((currentPos - offset) / step),
          ) < 0.01;
        if (isAligned && rawSnap !== currentPos) {
          const distToCurrent = Math.abs(val - currentPos);
          // Require moving 20% past the physical cell boundary (which is at step / 2)
          const threshold = step / 2 + step * 0.25;
          if (distToCurrent < threshold) {
            return currentPos; // Stay stuck to the current position
          }
        }
      }
      return rawSnap;
    };

    // Use a slightly larger nudge for sides to prevent z-fighting/stuckness
    const nudge =
      targetKind === "brick-side" || targetKind === "brick-body" ? 0.05 : 0.001;
    const hitX = point.x + normal.x * nudge;
    let hitY = point.y;

    // Superior vertical snapping
    if (normal.y > 0.5) hitY += nudge;
    else if (normal.y < -0.5) hitY -= nudge;

    const hitZ = point.z + normal.z * nudge;

    const currentX = latestPlacementCandidateRef.current
      ? latestPlacementCandidateRef.current.position[0]
      : null;
    const currentZ = latestPlacementCandidateRef.current
      ? latestPlacementCandidateRef.current.position[2]
      : null;

    const baseSnappedX = alignSnap(hitX, effW, MODULE_SIZE, currentX);
    const baseSnappedZ = alignSnap(hitZ, effD, MODULE_SIZE, currentZ);
    let testBricks: Omit<BrickData, "color">[] = [];

    if (activePreset) {
      const presetBricksData = getActivePresetBricks(activePreset, clipboard);
      if (presetBricksData) {
        const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
        const info = getPresetInfo(activePreset, clipboard);
        testBricks = presetBricksData.filter(isValidBrickData).map((b) => {
          let ox = b.position[0] - info.cx;
          let oz = b.position[2] - info.cz;
          let nx = ox,
            nz = oz;
          if (rotMod === 90 || rotMod === -270) {
            nx = -oz;
            nz = ox;
          } else if (Math.abs(rotMod) === 180) {
            nx = -ox;
            nz = -oz;
          } else if (rotMod === 270 || rotMod === -90) {
            nx = oz;
            nz = -ox;
          }
          return {
            ...b,
            rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
            position: [nx + baseSnappedX, b.position[1], nz + baseSnappedZ] as [
              number,
              number,
              number,
            ],
          };
        });
      }
    } else if (mode === "Move" && movingBrick) {
      const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
      const oxA = movingBrick.position[0] - movingGroupPivot[0];
      const ozA = movingBrick.position[2] - movingGroupPivot[2];
      let rXA = oxA,
        rZA = ozA;
      if (rotMod === 90 || rotMod === -270) {
        rXA = -ozA;
        rZA = oxA;
      } else if (Math.abs(rotMod) === 180) {
        rXA = -oxA;
        rZA = -ozA;
      } else if (rotMod === 270 || rotMod === -90) {
        rXA = ozA;
        rZA = -oxA;
      }

      const cPX = baseSnappedX - rXA;
      const cPZ = baseSnappedZ - rZA;
      const cPY = 0 - (movingBrick.position[1] - movingGroupPivot[1]);

      testBricks = movingGroupOriginalBricks.map((b) => {
        const ox = b.position[0] - movingGroupPivot[0];
        const oz = b.position[2] - movingGroupPivot[2];
        let nx = ox,
          nz = oz;
        if (rotMod === 90 || rotMod === -270) {
          nx = -oz;
          nz = ox;
        } else if (Math.abs(rotMod) === 180) {
          nx = -ox;
          nz = -oz;
        } else if (rotMod === 270 || rotMod === -90) {
          nx = oz;
          nz = -ox;
        }
        return {
          ...b,
          rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
          position: [
            cPX + nx,
            cPY + (b.position[1] - movingGroupPivot[1]),
            cPZ + nz,
          ] as [number, number, number],
        };
      });
    } else {
      testBricks = [
        {
          id: "ghost",
          type: activeType as any,
          position: [baseSnappedX, 0, baseSnappedZ],
          rotation: ghostRotation,
        },
      ];
    }

    let highestY = -BRICK_HEIGHT;
    const ignoredIds =
      mode === "Move" ? movingGroupOriginalBricks.map((b) => b.id) : [];

    for (const tb of testBricks) {
      const tbAABB = getBrickAABB(tb);
      for (const b of bricks) {
        if (ignoredIds.includes(b.id)) continue;
        const bAABB = getBrickAABB(b);
        if (doAABBsOverlap(tbAABB, bAABB, 0.001)) {
          const requiredBaseY = b.position[1] + BRICK_HEIGHT - tb.position[1];
          if (requiredBaseY > highestY) {
            highestY = requiredBaseY;
          }
        }
      }
    }

    let baseSnappedY = Math.max(
      0,
      Math.round(highestY / BRICK_HEIGHT) * BRICK_HEIGHT,
    );

    return [baseSnappedX, baseSnappedY, baseSnappedZ];
  };

  const updateGhostPosition = (
    point: THREE.Vector3,
    normal: THREE.Vector3,
    targetKind: string = "none",
  ) => {
    const position = computePlacementTarget(point, normal, targetKind);
    const state = useLegoStore.getState();
    const isDragging = state.isDraggingBrick;
    const isBuilding = state.mode === "Build";
    const isPlacingPreset = state.activePreset !== null;

    if (isDragging || isBuilding || isPlacingPreset) {
      setGhostPosition(position);
    } else if (state.mode === "Move" && movingBrickId) {
      const mb = state.bricks.find((b) => b.id === movingBrickId);
      if (mb) setGhostPosition(mb.position);
    }
  };

  const getPointerCoords = (e: any) => {
    const getTouchOpt = (touches?: any[]) =>
      touches && touches.length > 0 ? touches[0] : null;
    const eventParams = e.nativeEvent || e;
    const touch =
      getTouchOpt(eventParams.changedTouches) ||
      getTouchOpt(eventParams.touches);
    if (touch && typeof touch.clientX === "number") {
      return { x: touch.clientX, y: touch.clientY };
    }
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    if (e.nativeEvent && typeof e.nativeEvent.clientX === "number") {
      return { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    }
    return null;
  };

  const getCanonicalHit = (
    e: any,
  ): {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    object: THREE.Object3D;
    hitPoint: THREE.Vector3;
    targetKind: string;
    instanceId?: number;
  } | null => {
    if (!sceneGroupRef.current) return null;

    let intersects = e.intersections;

    if (!intersects || intersects.length === 0) return null;

    for (const hit of intersects) {
      if (!hit.object) continue;

      let isGhost = false;
      let isIgnored = false;
      let ptr: THREE.Object3D | null = hit.object;
      while (ptr) {
        if (ptr.name === "ghost" || (ptr as any).isPlacementGhost)
          isGhost = true;
        if (
          ptr.name === "GridHelper" ||
          ptr.name === "VRMenu" ||
          ptr.name.startsWith("presetPreview")
        )
          isIgnored = true;
        ptr = ptr.parent;
      }

      if (isGhost || isIgnored || hit.object.name === "GridHelper") continue;

      let targetKind = "none";
      if (hit.object.name === "FloorPlacementCollider") {
        targetKind = "floor";
      } else if (hit.object.name.includes("BrickBody")) {
        targetKind = "brick-body";
      } else if (hit.object.name.includes("BrickStud")) {
        targetKind = "brick-stud";
      }

      if (!isVR && targetKind !== "floor") {
        continue;
      }

      const worldNormal =
        hit.face?.normal
          ?.clone()
          .transformDirection(hit.object.matrixWorld)
          .normalize() || new THREE.Vector3(0, 1, 0);

      if (targetKind === "brick-body" || targetKind === "brick-stud") {
        if (worldNormal.y > 0.7) {
          targetKind = "brick-top";
        } else if (worldNormal.y < -0.7) {
          targetKind = "brick-bottom";
        } else {
          targetKind = "brick-side";
        }
      }

      if (targetKind === "brick-side" || targetKind === "brick-bottom") {
        continue;
      }

      const currentHitPoint = hit.point.clone();
      const currentHitObject = hit.object;
      const currentInstanceId = hit.instanceId;

      let p3 = currentHitPoint.clone();
      if (sceneGroupRef.current) {
        sceneGroupRef.current.worldToLocal(p3);
      } else {
        p3.divideScalar(currentVRScale);
      }

      // console.log("[hit]", targetKind, p3, worldNormal);

      return {
        point: p3,
        normal: worldNormal,
        object: currentHitObject,
        instanceId: currentInstanceId,
        targetKind,
        hitPoint: currentHitPoint,
      };
    }
    return null;
  };

  const getPlacementTargetFromEvent = (e: any) => {
    const hit = getCanonicalHit(e);
    if (!hit) return null;
    return computePlacementTarget(hit.point, hit.normal, hit.targetKind);
  };

  const updateGhostFromEvent = (e: any) => {
    const hit = getCanonicalHit(e);
    if (!hit) return false;
    const position = computePlacementTarget(
      hit.point,
      hit.normal,
      hit.targetKind,
    );
    latestPlacementCandidateRef.current = { hit, position };

    const state = useLegoStore.getState();
    const isDragging = state.isDraggingBrick;
    const isBuilding = state.mode === "Build";
    const isPlacingPreset = state.activePreset !== null;

    if (isDragging || isBuilding || isPlacingPreset) {
      setGhostPosition(position);
    } else if (state.mode === "Move" && movingBrick) {
      // Keep ghost at anchor if not dragging yet
      setGhostPosition(movingBrick.position);
    }
    return true;
  };

  useEffect(() => {
    // Clear refs on state change
    interactionStartCandidateRef.current = null;
    latestPlacementCandidateRef.current = null;

    // Fallback simple position reset based on grid center if needed, but we typically rely on ghost update from pointer
  }, [selectedType, ghostRotation, mode, movingBrickId, activePreset]);

  const lastMouseMoveRef = useRef<number>(0);

  const handlePointerMove = (e: any) => {
    const now = Date.now();
    if (now - lastMouseMoveRef.current < 16) return;
    lastMouseMoveRef.current = now;

    const isBuilding = mode === "Build";
    const currentMovingBrickId = useLegoStore.getState().movingBrickId;
    const isMoving = mode === "Move" && currentMovingBrickId !== null;
    const isPlacingPreset = activePreset !== null;

    // On screen, always update ghost if we are in an active tool mode,
    // even if not strictly "building" at this microsecond, to ensure responsiveness.
    if (!isBuilding && !isMoving && !isPlacingPreset) return;

    if (pointerDownPos.current) {
      const coords = getPointerCoords(e);
      if (coords) {
        const dx = coords.x - pointerDownPos.current.x;
        const dy = coords.y - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = pointerDownPos.current.isTouch ? 30 : 5;

        if (distance > threshold) {
          if (isMoving && !useLegoStore.getState().isDraggingBrick) {
            // Check if the selection can be moved
            const {
              bricks,
              movingBrickId,
              selectionMode,
              multiSelectedBrickIds,
            } = useLegoStore.getState();
            const anchor = bricks.find((b) => b.id === movingBrickId);
            if (anchor) {
              let selectionIds = [anchor.id];
              let selectionBricks = [anchor];
              if (selectionMode === "Group") {
                selectionBricks = getGroupBricks(anchor, bricks);
                selectionIds = selectionBricks.map((b) => b.id);
              } else if (selectionMode === "Multi") {
                selectionIds = multiSelectedBrickIds;
                selectionBricks = bricks.filter((b) =>
                  selectionIds.includes(b.id),
                );
              }

              const isBlocked = selectionBricks.some((b) =>
                hasBrickAbove(
                  b,
                  bricks,
                  MODULE_SIZE,
                  BRICK_HEIGHT,
                  selectionIds,
                ),
              );

              if (isBlocked) {
                useLegoStore
                  .getState()
                  .setToastMessage(
                    "Cannot move: selection is blocked by other bricks on top.",
                  );
                setTimeout(
                  () => useLegoStore.getState().setToastMessage(null),
                  3000,
                );
                // Reset pointerDownPos so we don't keep trying to start dragging
                pointerDownPos.current = null;
                return;
              }
            }

            setIsDraggingBrick(true);
            useLegoStore.getState().setJustSelectedBrick(false);
          }
        } else {
          // Still within the click/tap threshold, do not visually update the ghost yet
          // because if they release now, it will safely commit at interactionStartCandidateRef.
          return;
        }
      }
    }

    updateGhostFromEvent(e);
  };

  const ghostGroupBricks = useMemo(() => {
    if (mode !== "Move" || !movingBrick) return [];
    const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
    const oxA = movingBrick.position[0] - movingGroupPivot[0];
    const ozA = movingBrick.position[2] - movingGroupPivot[2];
    let rotatedOxA = oxA,
      rotatedOzA = ozA;
    if (rotMod === 90 || rotMod === -270) {
      rotatedOxA = -ozA;
      rotatedOzA = oxA;
    } else if (Math.abs(rotMod) === 180) {
      rotatedOxA = -oxA;
      rotatedOzA = -ozA;
    } else if (rotMod === 270 || rotMod === -90) {
      rotatedOxA = ozA;
      rotatedOzA = -oxA;
    }

    const currentPivotX = ghostPosition[0] - rotatedOxA;
    const currentPivotZ = ghostPosition[2] - rotatedOzA;
    const currentPivotY =
      ghostPosition[1] - (movingBrick.position[1] - movingGroupPivot[1]);

    return movingGroupOriginalBricks.map((b) => {
      const ox = b.position[0] - movingGroupPivot[0];
      const oz = b.position[2] - movingGroupPivot[2];
      let nx = ox,
        nz = oz;
      if (rotMod === 90 || rotMod === -270) {
        nx = -oz;
        nz = ox;
      } else if (Math.abs(rotMod) === 180) {
        nx = -ox;
        nz = -oz;
      } else if (rotMod === 270 || rotMod === -90) {
        nx = oz;
        nz = -ox;
      }

      return {
        ...b,
        rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
        position: [
          currentPivotX + nx,
          currentPivotY + (b.position[1] - movingGroupPivot[1]),
          currentPivotZ + nz,
        ] as [number, number, number],
      };
    });
  }, [
    movingGroupOriginalBricks,
    movingGroupPivot,
    ghostPosition,
    ghostRotation,
    mode,
    movingBrick,
  ]);

  const placementStatus = useMemo(() => {
    if ((mode !== "Build" && mode !== "Move") || activePreset)
      return { valid: false, reason: "inactive" };
    if (mode === "Move" && !movingBrickId)
      return { valid: false, reason: "no-selection" };

    if (mode === "Move") {
      const otherBricks = bricks.filter(
        (b) => !movingGroupOriginalBricks.some((m) => m.id === b.id),
      );
      return checkStructureValid(
        otherBricks,
        ghostGroupBricks,
        MODULE_SIZE,
        BRICK_HEIGHT,
      );
    }

    const activeType = movingBrick ? movingBrick.type : selectedType;
    const ghostBrickData = {
      id: movingBrickId || "ghost",
      type: activeType,
      position: ghostPosition,
      rotation: ghostRotation,
    };
    return checkPlacementValid(
      bricks,
      ghostBrickData,
      MODULE_SIZE,
      BRICK_HEIGHT,
    );
  }, [
    bricks,
    ghostPosition,
    ghostRotation,
    selectedType,
    mode,
    movingBrickId,
    movingBrick,
    activePreset,
    ghostGroupBricks,
    movingGroupOriginalBricks,
  ]);

  const presetBricks = useMemo(() => {
    const presetBricksData = getActivePresetBricks(activePreset, clipboard);
    if (!activePreset || !presetBricksData) return [];

    const validPresetBricks = presetBricksData.filter((b) => {
      const valid = isValidBrickData(b);
      if (!valid)
        console.warn(`Malformed brick found in preset ${activePreset}:`, b);
      return valid;
    });

    const info = getPresetInfo(activePreset, clipboard);

    return validPresetBricks.map((b) => {
      let ox = b.position[0] - info.cx;
      let oz = b.position[2] - info.cz;
      let nx = ox,
        nz = oz;

      const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
      if (rotMod === 90 || rotMod === -270) {
        nx = -oz;
        nz = ox;
      } else if (Math.abs(rotMod) === 180) {
        nx = -ox;
        nz = -oz;
      } else if (rotMod === 270 || rotMod === -90) {
        nx = oz;
        nz = -ox;
      }

      return {
        ...b,
        rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
        position: [
          nx + ghostPosition[0],
          b.position[1] + ghostPosition[1],
          nz + ghostPosition[2],
        ] as [number, number, number],
      };
    });
  }, [activePreset, ghostPosition, ghostRotation]);

  const presetPlacementStatus = useMemo(() => {
    if (mode !== "Build" || !activePreset)
      return { valid: false, reason: "inactive" };
    return checkStructureValid(bricks, presetBricks, MODULE_SIZE, BRICK_HEIGHT);
  }, [bricks, presetBricks, activePreset, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        interactionStartCandidateRef.current = null;
        latestPlacementCandidateRef.current = null;
        if (useLegoStore.getState().activePreset) {
          useLegoStore.getState().loadPreset(null);
        }
        if (marqueeStart) {
          setMarqueeStart(null);
          setMarqueeCurrent(null);
          if (controlsRef.current) controlsRef.current.enabled = true;
        }
      }

      const { bricks, mode, selectionMode, multiSelectedBrickIds } =
        useLegoStore.getState();

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (
          mode === "Move" &&
          selectionMode === "Multi" &&
          multiSelectedBrickIds.length > 0
        ) {
          const copied = bricks.filter((b) =>
            multiSelectedBrickIds.includes(b.id),
          );

          if (copied.length > 0) {
            // Create relative offsets based on their center so they aren't offset wildly
            let minX = Infinity,
              minZ = Infinity;
            copied.forEach((b) => {
              if (b.position[0] < minX) minX = b.position[0];
              if (b.position[2] < minZ) minZ = b.position[2];
            });
            const normalized = copied.map((b) => ({
              ...b,
              position: [
                b.position[0] - minX,
                b.position[1],
                b.position[2] - minZ,
              ] as [number, number, number],
            }));
            setClipboard(normalized);
          }
        }
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard.length > 0) {
          useLegoStore.getState().setClipboardBricks(clipboard);
          useLegoStore.getState().loadPreset("clipboard" as any);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [marqueeStart, clipboard]);

  useEffect(() => {
    if (!marqueeStart) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      setMarqueeCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onPointerUp = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      setMarqueeCurrent({ x: endX, y: endY });

      const minX = Math.min(marqueeStart.x, endX);
      const maxX = Math.max(marqueeStart.x, endX);
      const minY = Math.min(marqueeStart.y, endY);
      const maxY = Math.max(marqueeStart.y, endY);

      const { bricks, setMultiSelectedBrickIds, setSelectionMode } =
        useLegoStore.getState();
      const selectedIds: string[] = [];
      const cam = camera.clone();

      // Only select if there was an actual drag, otherwise it's just a click (or deselect)
      if (maxX - minX > 5 || maxY - minY > 5) {
        bricks.forEach((brick) => {
          // Exception: never select bricks that are not on the very top of a stack.
          if (hasBrickAbove(brick, bricks, MODULE_SIZE, BRICK_HEIGHT)) return;

          const aabb = getBrickAABB(brick);
          const corners = [
            new THREE.Vector3(aabb.minX, brick.position[1], aabb.minZ),
            new THREE.Vector3(aabb.minX, brick.position[1], aabb.maxZ),
            new THREE.Vector3(
              aabb.minX,
              brick.position[1] + BRICK_HEIGHT,
              aabb.minZ,
            ),
            new THREE.Vector3(
              aabb.minX,
              brick.position[1] + BRICK_HEIGHT,
              aabb.maxZ,
            ),
            new THREE.Vector3(aabb.maxX, brick.position[1], aabb.minZ),
            new THREE.Vector3(aabb.maxX, brick.position[1], aabb.maxZ),
            new THREE.Vector3(
              aabb.maxX,
              brick.position[1] + BRICK_HEIGHT,
              aabb.minZ,
            ),
            new THREE.Vector3(
              aabb.maxX,
              brick.position[1] + BRICK_HEIGHT,
              aabb.maxZ,
            ),
          ];

          let inside = false;
          for (const c of corners) {
            c.project(cam);
            const sx = (c.x * 0.5 + 0.5) * rect.width;
            const sy = (1 - (c.y * 0.5 + 0.5)) * rect.height;
            if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
              inside = true;
              break;
            }
          }
          if (inside) {
            selectedIds.push(brick.id);
          }
        });
      }

      if (e.shiftKey) {
        setSelectionMode("Multi");
        const current = useLegoStore.getState().multiSelectedBrickIds;
        setMultiSelectedBrickIds(
          Array.from(new Set([...current, ...selectedIds])),
        );
      } else {
        if (selectedIds.length > 0) {
          setSelectionMode("Multi");
          setMultiSelectedBrickIds(selectedIds);
        } else if (maxX - minX <= 5 && maxY - minY <= 5) {
          // Wait, a standard click on empty space will fall here
          // We do not want to deselect if they just clicked empty space?
          // Ah wait, standard click on empty space clears selection! This is correct.
          setMultiSelectedBrickIds([]);
        }
      }

      setMarqueeStart(null);
      setMarqueeCurrent(null);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [marqueeStart, camera, gl]);

  const handleContextMenu = (e: any) => {
    e.stopPropagation();
    if (useLegoStore.getState().activePreset) {
      useLegoStore.getState().loadPreset(null);
    }
  };

  const pointerDownPos = useRef<{
    x: number;
    y: number;
    isTouch: boolean;
  } | null>(null);

  const isMultiTouchRef = useRef(false);

  const handlePointerDown = (e: any) => {
    // Check multi-touch
    const touchesCount = e.nativeEvent?.touches
      ? e.nativeEvent.touches.length
      : 0;
    if (touchesCount >= 2) {
      isMultiTouchRef.current = true;
      pointerDownPos.current = null;
      return;
    } else if (touchesCount === 1) {
      isMultiTouchRef.current = false;
    }

    if (mode === "Move" && movingBrick) {
      isBrickInteractionRef.current = true;
    }
    if (e.button === 2 || e.nativeEvent?.type === "contextmenu") return;
    const coords = getPointerCoords(e);
    if (!coords) return;
    const isTouch =
      e.pointerType === "touch" ||
      e.nativeEvent?.pointerType === "touch" ||
      e.nativeEvent?.type?.includes("touch") ||
      false;

    if (
      e.object?.name === "Grid" &&
      mode === "Move" &&
      !isTouch &&
      e.button === 0 &&
      isCameraLocked
    ) {
      const rect = gl.domElement.getBoundingClientRect();
      const localX = coords.x - rect.left;
      const localY = coords.y - rect.top;
      setMarqueeStart({ x: localX, y: localY });
      setMarqueeCurrent({ x: localX, y: localY });
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      e.stopPropagation();
      return;
    }

    pointerDownPos.current = { x: coords.x, y: coords.y, isTouch };

    const isBuilding = mode === "Build";
    const currentMovingBrickId = useLegoStore.getState().movingBrickId;
    const isMoving = mode === "Move" && currentMovingBrickId !== null;
    const isDragging = useLegoStore.getState().isDraggingBrick;
    const isPlacingPreset = activePreset !== null;

    // In Move mode, don't snap to pointer on down unless we are already dragging
    if (isBuilding || isPlacingPreset || (isMoving && isDragging)) {
      const hit = getCanonicalHit(e);
      if (hit) {
        if (!isCameraLocked && controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        e.stopPropagation();
        const position = computePlacementTarget(
          hit.point,
          hit.normal,
          hit.targetKind,
        );
        const candidate = { hit, position };
        interactionStartCandidateRef.current = candidate;
        latestPlacementCandidateRef.current = candidate;
        setGhostPosition(position);
      }
    }
  };

  const executeCommit = (candidate: PlacementCandidate) => {
    setIsDraggingBrick(false);

    const now = Date.now();
    if (now - lastPlacementRef.current < 50) return false;
    lastPlacementRef.current = now;

    let currentGhostPos = candidate.position;

    if (
      candidate.hit.targetKind === "rotation-only" &&
      mode === "Move" &&
      movingBrick
    ) {
      const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
      const oxA = movingBrick!.position[0] - movingGroupPivot[0];
      const ozA = movingBrick!.position[2] - movingGroupPivot[2];
      let rotatedOxA = oxA,
        rotatedOzA = ozA;
      if (rotMod === 90 || rotMod === -270) {
        rotatedOxA = -ozA;
        rotatedOzA = oxA;
      } else if (Math.abs(rotMod) === 180) {
        rotatedOxA = -oxA;
        rotatedOzA = -ozA;
      } else if (rotMod === 270 || rotMod === -90) {
        rotatedOxA = ozA;
        rotatedOzA = -oxA;
      }
      currentGhostPos = [
        movingGroupPivot[0] + rotatedOxA,
        movingBrick!.position[1],
        movingGroupPivot[2] + rotatedOzA,
      ];
    }

    setGhostPosition(currentGhostPos);

    let commitSuccess = false;

    const checkCurrentPlacement = () => {
      if (mode === "Move") {
        if (!movingBrick)
          return {
            status: { valid: false, reason: "no moving brick" },
            ghostGroupBricks: [] as any[],
          };
        // validate the whole group
        const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
        const oxA = movingBrick!.position[0] - movingGroupPivot[0];
        const ozA = movingBrick!.position[2] - movingGroupPivot[2];
        let rotatedOxA = oxA,
          rotatedOzA = ozA;
        if (rotMod === 90 || rotMod === -270) {
          rotatedOxA = -ozA;
          rotatedOzA = oxA;
        } else if (Math.abs(rotMod) === 180) {
          rotatedOxA = -oxA;
          rotatedOzA = -ozA;
        } else if (rotMod === 270 || rotMod === -90) {
          rotatedOxA = ozA;
          rotatedOzA = -oxA;
        }

        const currentPivotX = currentGhostPos[0] - rotatedOxA;
        const currentPivotZ = currentGhostPos[2] - rotatedOzA;
        const currentPivotY =
          currentGhostPos[1] - (movingBrick!.position[1] - movingGroupPivot[1]);

        const testGroupBricks = movingGroupOriginalBricks.map((b) => {
          const ox = b.position[0] - movingGroupPivot[0];
          const oz = b.position[2] - movingGroupPivot[2];
          let nx = ox,
            nz = oz;
          if (rotMod === 90 || rotMod === -270) {
            nx = -oz;
            nz = ox;
          } else if (Math.abs(rotMod) === 180) {
            nx = -ox;
            nz = -oz;
          } else if (rotMod === 270 || rotMod === -90) {
            nx = oz;
            nz = -ox;
          }

          return {
            ...b,
            rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
            position: [
              currentPivotX + nx,
              currentPivotY + (b.position[1] - movingGroupPivot[1]),
              currentPivotZ + nz,
            ] as [number, number, number],
          };
        });

        const otherBricks = bricks.filter(
          (b) => !movingGroupOriginalBricks.some((m) => m.id === b.id),
        );
        return {
          status: checkStructureValid(
            otherBricks,
            testGroupBricks,
            MODULE_SIZE,
            BRICK_HEIGHT,
          ),
          ghostGroupBricks: testGroupBricks,
        };
      } else {
        const testBrickData = {
          id: "ghost",
          type: selectedType,
          position: currentGhostPos as [number, number, number],
          rotation: ghostRotation,
        };
        return {
          status: checkPlacementValid(
            bricks,
            testBrickData,
            MODULE_SIZE,
            BRICK_HEIGHT,
          ),
          ghostGroupBricks: [],
        };
      }
    };

    const checkCurrentPresetPlacement = () => {
      const presetBricksData = getActivePresetBricks(activePreset, clipboard);
      if (!activePreset || !presetBricksData)
        return { valid: false, reason: "inactive" };
      const info = getPresetInfo(activePreset, clipboard);
      const testPresetBricks = presetBricksData
        .filter(isValidBrickData)
        .map((b) => {
          let ox = b.position[0] - info.cx;
          let oz = b.position[2] - info.cz;
          let nx = ox,
            nz = oz;

          const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
          if (rotMod === 90 || rotMod === -270) {
            nx = -oz;
            nz = ox;
          } else if (Math.abs(rotMod) === 180) {
            nx = -ox;
            nz = -oz;
          } else if (rotMod === 270 || rotMod === -90) {
            nx = oz;
            nz = -ox;
          }

          return {
            ...b,
            rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
            position: [
              nx + currentGhostPos[0],
              b.position[1] + currentGhostPos[1],
              nz + currentGhostPos[2],
            ] as [number, number, number],
          };
        });
      return checkStructureValid(
        bricks,
        testPresetBricks,
        MODULE_SIZE,
        BRICK_HEIGHT,
      );
    };

    if (activePreset) {
      if (checkCurrentPresetPlacement().valid) {
        commitPreset(currentGhostPos, ghostRotation);
        const nextGhostPos = [
          currentGhostPos[0],
          currentGhostPos[1] + BRICK_HEIGHT,
          currentGhostPos[2],
        ] as [number, number, number];
        setGhostPosition(nextGhostPos);
        latestPlacementCandidateRef.current = {
          hit: candidate.hit,
          position: nextGhostPos,
        };
        commitSuccess = true;
      } else {
        useLegoStore
          .getState()
          .setToastMessage(
            `Preset cannot be placed here. Move it to open supported space.`,
          );
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }
      interactionStartCandidateRef.current = null;
      latestPlacementCandidateRef.current = null;
      return commitSuccess;
    }

    if (mode === "Build" && !activePreset) {
      const { status } = checkCurrentPlacement();
      if (status.valid) {
        addBrick({
          type: selectedType,
          color: selectedColor,
          position: currentGhostPos,
          rotation: ghostRotation,
        });

        const nextGhostPos = [
          currentGhostPos[0],
          currentGhostPos[1] + BRICK_HEIGHT,
          currentGhostPos[2],
        ] as [number, number, number];
        setGhostPosition(nextGhostPos);
        latestPlacementCandidateRef.current = {
          hit: candidate.hit,
          position: nextGhostPos,
        };
        commitSuccess = true;
      } else if (status.reason === "floating") {
        useLegoStore.getState().setToastMessage("Cannot float in mid-air.");
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 2000);
      }
    } else if (mode === "Move" && movingBrick) {
      const justSelected = useLegoStore.getState().justSelectedBrick;

      // In VR we don't have isClick exactly because VR is explicitly triggering commit.
      // But if justSelected is true we might skip if it was a selection click.
      const { status, ghostGroupBricks } = checkCurrentPlacement();
      if (status.valid) {
        if (movingGroupOriginalBricks.length > 1) {
          useLegoStore.getState().updateBricks(
            ghostGroupBricks.map((b) => ({
              id: b.id,
              updates: {
                position: b.position as [number, number, number],
                rotation: b.rotation,
              },
            })),
          );
        } else {
          useLegoStore.getState().updateBrick(movingBrick.id, {
            position: currentGhostPos,
            rotation: ghostRotation,
          });
        }
        setMovingBrickId(null);
        commitSuccess = true;
      } else {
        useLegoStore
          .getState()
          .setToastMessage(`Cannot move: ${status.reason}`);
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }

      // Always clear justSelected on any action release
      useLegoStore.getState().setJustSelectedBrick(false);
    }

    interactionStartCandidateRef.current = null;
    latestPlacementCandidateRef.current = null;
    return commitSuccess;
  };

  executeCommitRef.current = executeCommit;

  const handlePointerUp = (e: any) => {
    isBrickInteractionRef.current = false;

    if (!isCameraLocked && controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    const wasMultiTouch = isMultiTouchRef.current;

    if (e.button === 2 || e.nativeEvent?.type === "contextmenu") return;

    if (wasMultiTouch) {
      // It was a multi-touch gesture, do not treat as a click/placement
      return;
    }

    const coords = getPointerCoords(e);
    let isClick = false;
    let distance = 0;

    if (pointerDownPos.current) {
      if (coords) {
        const dx = coords.x - pointerDownPos.current.x;
        const dy = coords.y - pointerDownPos.current.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        const threshold = pointerDownPos.current.isTouch ? 30 : 10;
        isClick = distance <= threshold;
      } else {
        isClick = true; // No coordinates fallback for pointer up? Assuming it was a click anyway
      }
      pointerDownPos.current = null;

      if (!isClick && !useLegoStore.getState().isDraggingBrick) {
        return; // It was a camera drag
      }
    } else {
      isClick = true; // pointerDown wasn't recorded here (e.g. fired on ground)
    }

    if (
      !isClick &&
      mode === "Move" &&
      useLegoStore.getState().justSelectedBrick
    ) {
      return;
    }

    let fallbackHit = getCanonicalHit(e);
    let candidate =
      isClick && interactionStartCandidateRef.current
        ? interactionStartCandidateRef.current
        : latestPlacementCandidateRef.current ||
          (fallbackHit
            ? {
                hit: fallbackHit,
                position: computePlacementTarget(
                  fallbackHit.point,
                  fallbackHit.normal,
                  fallbackHit.targetKind,
                ),
              }
            : null);

    const hit = candidate?.hit;

    if (isClick && mode === "Move" && cameraMode === "Zoom") {
      if (controlsRef.current && camera) {
        const isZoomOut = e.shiftKey || e.button === 2;
        const factor = isZoomOut ? 1.25 : 0.8;
        const target = controlsRef.current.target;
        camera.position.sub(target).multiplyScalar(factor).add(target);
        controlsRef.current.update();
      }
      return;
    }

    if (hit) {
      let shouldCommit = true;
      if (
        mode === "Move" &&
        useLegoStore.getState().justSelectedBrick &&
        isClick
      ) {
        shouldCommit = false;
        useLegoStore.getState().setJustSelectedBrick(false);
      }

      if (mode === "Move" && !useLegoStore.getState().isDraggingBrick) {
        shouldCommit = false;
      }

      if ((import.meta as any).env.DEV) {
        const rect = gl.domElement.getBoundingClientRect();
        const coords = getPointerCoords(e) || { x: 0, y: 0 };
        const ndc = clientToCanvasNDC(coords.x, coords.y, rect);
        const snappedPos = candidate?.position;
        console.log({
          pointerType: e.pointerType || e.nativeEvent?.pointerType || "mouse",
          clientX: coords.x,
          clientY: coords.y,
          canvasRect: rect,
          NDC: [ndc.x, ndc.y],
          hitObject: hit.object?.name,
          targetKind: hit.targetKind,
          hitPoint: hit.point,
          normal: hit.normal,
          snappedPosition: snappedPos,
          ghostPosition: ghostPosition,
          committedPosition: shouldCommit ? snappedPos : null,
          mode: mode,
        });
      }

      if (shouldCommit && candidate) {
        executeCommit(candidate);
      } else {
        setIsDraggingBrick(false);
      }
    } else {
      if ((import.meta as any).env.DEV)
        console.log("[HIT] null - no viable target found");
    }
    interactionStartCandidateRef.current = null;
  };

  // Optimization: Group bricks by [type, color] for InstancedMesh rendering
  const groupedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    const movingIds = new Set(movingGroupOriginalBricks.map((b) => b.id));
    bricks.forEach((brick) => {
      if ((mode === "Move" || mode === "Delete") && movingIds.has(brick.id))
        return;
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [bricks, mode, movingGroupOriginalBricks]);

  const groupedOriginalSelectedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    if (
      (mode === "Move" || mode === "Delete") &&
      movingGroupOriginalBricks.length > 0
    ) {
      movingGroupOriginalBricks.forEach((brick) => {
        const key = `${brick.type}_${brick.color}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(brick);
      });
    }
    return groups;
  }, [movingGroupOriginalBricks, mode]);

  const groupedPresetBricks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    presetBricks.forEach((brick) => {
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [presetBricks]);

  const groupedGhostGroupBricks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    ghostGroupBricks.forEach((brick) => {
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [ghostGroupBricks]);

  const mouseButtons = useMemo(() => {
    switch (cameraMode) {
      case "Orbit":
        return {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        };
      case "Pan":
        return {
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        };
      case "Zoom":
        return {
          LEFT: THREE.MOUSE.DOLLY,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        };
    }
  }, [cameraMode]);

  const touches = useMemo(() => {
    // We cast undefined as any to bypass Drei's strict typing if it doesn't allow undefined
    switch (cameraMode) {
      case "Orbit":
        return { ONE: THREE.TOUCH.ROTATE as any, TWO: THREE.TOUCH.DOLLY_PAN };
      case "Pan":
        return { ONE: THREE.TOUCH.PAN as any, TWO: THREE.TOUCH.DOLLY_PAN };
      case "Zoom":
        // For zoom mode, we want one finger to potentially zoom if we implemented it,
        // but since OrbitControls doesn't support it for ONE, we set it to undefined
        // to avoid "moving" (panning) which confused the user.
        return { ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_PAN };
    }
  }, [cameraMode]);

  const cameraZoomTrigger = useLegoStore((state) => state.cameraZoomTrigger);
  const cameraZoomDirection = useLegoStore(
    (state) => state.cameraZoomDirection,
  );
  const cameraRecenterTrigger = useLegoStore(
    (state) => state.cameraRecenterTrigger,
  );

  useEffect(() => {
    if (cameraZoomTrigger === 0) return;
    if (!controlsRef.current || xrSessionActive || isVR || gl.xr.isPresenting)
      return;
    if (cameraZoomDirection === "in") {
      controlsRef.current.dollyIn(1.15);
    } else {
      controlsRef.current.dollyOut(1.15);
    }
    controlsRef.current.update();
  }, [cameraZoomTrigger, cameraZoomDirection]);

  useEffect(() => {
    if (cameraRecenterTrigger === 0) return;
    if (!controlsRef.current || xrSessionActive || isVR || gl.xr.isPresenting)
      return;
    controlsRef.current.reset();
    controlsRef.current.target.set(0, 0.2, 0);
    camera.position.set(2.8, 2.2, 3.2);
    controlsRef.current.update();
  }, [cameraRecenterTrigger, camera]);

  const [isVR, setIsVR] = useState(false);

  useEffect(() => {
    const handleSessionStart = () => {
      setIsVR(true);
      interactionStartCandidateRef.current = null;
      latestPlacementCandidateRef.current = null;
      // Provide an initial teleport offset so user isn't immediately inside the grid
      teleportPlayer({ x: 0, y: 0, z: -1.0 });
    };
    const handleSessionEnd = () => {
      setIsVR(false);
      interactionStartCandidateRef.current = null;
      latestPlacementCandidateRef.current = null;
    };
    gl.xr.addEventListener("sessionstart", handleSessionStart);
    gl.xr.addEventListener("sessionend", handleSessionEnd);
    return () => {
      gl.xr.removeEventListener("sessionstart", handleSessionStart);
      gl.xr.removeEventListener("sessionend", handleSessionEnd);
    };
  }, [gl.xr]);

  const gridRef = useRef<THREE.Mesh>(null);
  const vrFloorRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    vrTargetManager.register(gridRef.current);
    vrTargetManager.register(vrFloorRef.current);
    return () => {
      vrTargetManager.unregister(gridRef.current);
      vrTargetManager.unregister(vrFloorRef.current);
    };
  }, []);

  return (
    <>
      <color attach="background" args={["#1c2834"]} />
      <Suspense fallback={null}>
        {!xrSessionActive && (
          <>
            <Environment preset="sunset" background blur={0.4} />
            <Stars
              radius={100}
              depth={50}
              count={5000}
              factor={4}
              saturation={0}
              fade
              speed={1}
            />
          </>
        )}
      </Suspense>
      <fog attach="fog" args={["#1c2834", 10, 200]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#001804" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.0}
        castShadow={!xrSessionActive}
        shadow-mapSize-width={!xrSessionActive ? 2048 : 512}
        shadow-mapSize-height={!xrSessionActive ? 2048 : 512}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {!xrSessionActive && (
        <ContactShadows
          resolution={1024}
          scale={40}
          blur={2}
          opacity={0.3}
          far={10}
          color="#000000"
          position={[0, -0.01, 0]}
        />
      )}

      <Suspense fallback={null}>
        {xrSessionActive && showXRPerf && <VRStats />}
        {xrSessionActive &&
          (() => {
            switch (xrPanel) {
              case "waitingControllers":
                return <VRWaitingPanel />;
              case "onboarding":
                return <VROnboarding />;
              case "buildMenu":
                return <VRRadialMenu vrScale={vrScale} />;
              case "palette":
                return <VRPalette />;
              default:
                return null;
            }
          })()}

        {xrSessionActive && <VRDebugVisibilityLayer />}

        {xrSessionActive && vrScale === "human" && (
          <HumanViewLayer
            currentVRScale={currentVRScale}
            sceneGroupRef={sceneGroupRef}
            updateGhostPosition={updateGhostPosition}
            handleVRCommit={handleVRCommit}
          />
        )}
      </Suspense>
      <group
        ref={sceneGroupRef}
        scale={currentVRScale}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={() => {
          interactionStartCandidateRef.current = null;
          latestPlacementCandidateRef.current = null;
        }}
        onContextMenu={handleContextMenu}
      >
        <group ref={exportGroupRef}>
          {/* Visualized Bricks using InstancedMesh */}
          {Object.entries(groupedBricks).map(([key, group]) => {
            const [type, color] = key.split("_");
            return (
              <BrickInstances
                key={key}
                type={type as any}
                color={color}
                bricks={group}
              />
            );
          })}
        </group>

        {!isScreenshotting &&
          mode === "Build" &&
          !activePreset &&
          placementStatus.valid && (
            <group>
              <BrickInstances
                type={selectedType}
                color={selectedColor}
                bricks={[
                  {
                    id: "ghost",
                    position: ghostPosition,
                    rotation: ghostRotation,
                  },
                ]}
                isGhost
              />
              {!xrSessionActive && (
                <mesh
                  position={ghostPosition}
                  rotation={[-Math.PI / 2, 0, 0]}
                  raycast={() => null}
                >
                  <ringGeometry args={[0.04, 0.05, 32]} />
                  <meshBasicMaterial
                    color={selectedColor}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              )}
            </group>
          )}

        {!isScreenshotting &&
          (mode === "Move" || mode === "Delete") &&
          movingGroupOriginalBricks.length > 0 && (
            <>
              {/* The ghost preview that follows the mouse */}
              {mode === "Move" &&
                isDraggingBrick &&
                placementStatus.valid &&
                Object.entries(groupedGhostGroupBricks).map(([key, group]) => {
                  const [type, color] = key.split("_");
                  return (
                    <BrickInstances
                      key={`moving-ghost-${key}`}
                      type={type as any}
                      color={color}
                      bricks={group}
                      isGhost
                    />
                  );
                })}
              {/* The original bricks left in place (visual only) */}
              {Object.entries(groupedOriginalSelectedBricks).map(
                ([key, group]) => {
                  const [type, color] = key.split("_");
                  return (
                    <BrickInstances
                      key={`original-ghost-${key}`}
                      type={type as any}
                      color={color}
                      bricks={group}
                      isGhost={true}
                    />
                  );
                },
              )}
            </>
          )}

        {!isScreenshotting && activePreset && presetPlacementStatus.valid && (
          <>
            {Object.entries(groupedPresetBricks).map(([key, group]) => {
              const [type, color] = key.split("_");
              return (
                <BrickInstances
                  key={`preset-ghost-${key}`}
                  type={type as any}
                  color={color}
                  bricks={group}
                  isGhost
                />
              );
            })}
            {/* Tiny anchor marker for the preset origin */}
            <mesh position={ghostPosition} raycast={() => null}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.6}
                depthTest={false}
              />
            </mesh>
          </>
        )}

        <group>
          <mesh
            name="FloorPlacementCollider"
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial
              visible={false}
              depthWrite={false}
              colorWrite={false}
            />
          </mesh>
          <mesh
            ref={vrFloorRef}
            name="VRFloorCollider"
            userData={{ isVRPlacementTarget: true }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
          >
            <planeGeometry args={[40, 40]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          <mesh
            ref={gridRef}
            name="Grid"
            raycast={() => null}
            receiveShadow={!xrSessionActive}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#002D04" />
          </mesh>
          {!xrSessionActive && (
            <gridHelper
              args={[40, 500, "#004010", "#003A0A"]}
              position={[0, 0.001, 0]}
            />
          )}
          {xrSessionActive && (
            <gridHelper
              args={[40, 40, "#004010", "#003A0A"]}
              position={[0, 0.001, 0]}
            />
          )}
        </group>
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={0.5}
        maxDistance={100}
        enableDamping={true}
        dampingFactor={0.1}
        enabled={!isCameraLocked && !isVR && !isDraggingBrick && !marqueeStart}
        mouseButtons={mouseButtons as any}
        touches={touches as any}
      />

      {marqueeStart && marqueeCurrent && (
        <Html
          center={false}
          prepend
          calculatePosition={() => [0, 0]}
          style={{ pointerEvents: "none", zIndex: 9999 }}
        >
          <div
            style={{
              position: "absolute",
              left: Math.min(marqueeStart.x, marqueeCurrent.x),
              top: Math.min(marqueeStart.y, marqueeCurrent.y),
              width: Math.abs(marqueeCurrent.x - marqueeStart.x),
              height: Math.abs(marqueeCurrent.y - marqueeStart.y),
              border: "1px solid #4da6ff",
              backgroundColor: "rgba(77, 166, 255, 0.2)",
              pointerEvents: "none",
            }}
          />
        </Html>
      )}
    </>
  );
};

export const Scene = ({ xrStore }: { xrStore?: any }) => {
  return xrStore ? (
    <XR store={xrStore}>
      <Locomotion />
      <SceneContents xrStore={xrStore} />
    </XR>
  ) : (
    <SceneContents />
  );
};
