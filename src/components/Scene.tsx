import React, { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";
import { XR } from "@react-three/xr";
import * as THREE from "three";
import { LegoBrick } from "./LegoBrick";
import { BrickInstances } from "./BrickInstances";
import {
  useLegoStore,
  checkPlacementValid,
  checkStructureValid,
  getBrickDimensions,
  getPresetInfo,
  PRESETS,
  isValidBrickData,
  BrickData,
  getGroupBricks,
  LEGO_COLORS,
  getBrickAABB,
  doAABBsOverlap,
} from "../Store";

import { VRRadialMenu } from "./VRRadialMenu";
import { vrTargetManager } from "../lib/vrTargets";

import { HumanViewLayer } from "./VRViewLayers";

export type VRScaleMode = "human";

const VR_SCALE_VALUES: Record<VRScaleMode, number> = {
  human: 1.0,
};

const VRDebugVisibilityLayer = () => {
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
        <Text fontSize={0.1} color="white">
          XR rendering active
        </Text>
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
          mat.forEach(m => { m.needsUpdate = true; });
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
        gl.setPixelRatio(window.devicePixelRatio);
      } else {
        setVrReady(false);
        gl.setPixelRatio(1); // Standard VR performance optimization
      }
    });
  }, [xrStore, gl]);

  useEffect(() => {
    if (xrSessionActive) {
      let rafId: number;
      let startTime = Date.now();

      const checkReady = () => {
        // Compile scene to reduce shader stutter
        try {
          gl.compile(scene, camera);
        } catch (e) {}

        const targets = vrTargetManager.getValidTargets();
        const hasGrid = targets.some((t) => t.name === "Grid");

        let hasController = false;
        try {
          hasController = gl.xr.getController(0) !== undefined;
        } catch (e) {}

        // Wait up to 3s, or until conditions met
        const timeElapsed = Date.now() - startTime;
        if ((hasGrid && hasController) || timeElapsed > 3000) {
          teleportPlayer({ x: 0, y: 0.5, z: 0.8 });
          setVrReady(true);
        } else {
          rafId = requestAnimationFrame(checkReady);
        }
      };

      rafId = requestAnimationFrame(checkReady);
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
  const updateBrick = useLegoStore((state) => state.updateBrick);
  const isDraggingBrick = useLegoStore((state) => state.isDraggingBrick);
  const setIsDraggingBrick = useLegoStore((state) => state.setIsDraggingBrick);
  const selectionMode = useLegoStore((state) => state.selectionMode);
  const multiSelectedBrickIds = useLegoStore(
    (state) => state.multiSelectedBrickIds,
  );
  const isCameraLocked = useLegoStore((state) => state.isCameraLocked);

  const controlsRef = useRef<any>(null);
  const isBrickInteractionRef = useRef(false);

  const handlePointerUpRef = useRef<any>(null);

  const executeCommitRef = useRef<any>(null);

  useEffect(() => {
    handlePointerUpRef.current = handlePointerUp;
    // We update executeCommitRef when we render, but the function isn't defined yet! It's defined at line 817.
    // It's hoisted or we can just keep executeCommitRef and update it right after executeCommit is defined later down.
  });

  useEffect(() => {
    const handleVRControllerAction = (e: any) => {
      const { type, point, normal, action } = e.detail;

      if (type === "cancelMove") {
        // handle cancel move, already handled via event but we can centralise
      }

      if (type === "trigger") {
        pointerDownPos.current = null;

        if (action === "commit") {
          if (executeCommitRef.current) {
            executeCommitRef.current(point, normal);
          }
        }
      }
    };
    window.addEventListener("vr-controller-action", handleVRControllerAction);
    return () =>
      window.removeEventListener(
        "vr-controller-action",
        handleVRControllerAction,
      );
  }, []);

  useFrame((state) => {
    if (controlsRef.current) {
      if (isCameraLocked || isVR) {
        controlsRef.current.enabled = false;
      } else {
        controlsRef.current.enabled =
          !isBrickInteractionRef.current && !isDraggingBrick;
      }
      if (controlsRef.current.target.y < 0) {
        controlsRef.current.target.y = 0;
      }
      if (state.camera.position.y < 0.1) {
        state.camera.position.y = 0.1;
      }
    }
  });

  useEffect(() => {
    const onScreenshot = () => {
      setIsScreenshotting(true);
      setTimeout(() => {
        // Must render first to ensure canvas has content
        gl.render(scene, camera);
        const link = document.createElement("a");
        link.download = "brickxr-screenshot.png";
        link.href = gl.domElement.toDataURL("image/png");
        link.click();
        setIsScreenshotting(false);
      }, 50);
    };
    window.addEventListener("take-screenshot", onScreenshot);
    return () => window.removeEventListener("take-screenshot", onScreenshot);
  }, [gl, scene, camera]);

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
      const refSpace = await session.requestReferenceSpace("local-floor");
      const transform = new XRRigidTransform(offsetPosition, {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      });
      gl.xr.setReferenceSpace(refSpace.getOffsetReferenceSpace(transform));
      console.log("Teleport success to", offsetPosition);
    } catch(err) {
      console.warn("Teleport failed", err);
    }
  }

  const toggleScale = () => {
    // Disabled until Micro mode has interaction
  };

  useEffect(() => {
    const handleRotate = () => setGhostRotation((r) => (r + 90) % 360);
    const handleSetRotation = (e: any) => setGhostRotation(e.detail);
    window.addEventListener("rotate-ghost", handleRotate);
    window.addEventListener("set-ghost-rotation", handleSetRotation);
    return () => {
      window.removeEventListener("rotate-ghost", handleRotate);
      window.removeEventListener("set-ghost-rotation", handleSetRotation);
    };
  }, []);

  const MODULE_SIZE = 0.08;
  const HALF_MODULE = MODULE_SIZE / 2;
  const BRICK_HEIGHT = 0.096;

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

  const lastPointerHit = useRef<{
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } | null>(null);

  const computePlacementTarget = (
    point: THREE.Vector3,
    normal: THREE.Vector3,
  ): [number, number, number] => {
    let w = 1, d = 1;
    const activeType = activePreset
      ? "1x1"
      : movingBrick
        ? movingBrick.type
        : selectedType;

    if (activePreset) {
      const info = getPresetInfo(activePreset);
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

    const alignSnap = (val: number, _count: number, step: number) => {
      return Math.round(val / step) * step;
    };

    const nudge = 0.001;
    const hitX = point.x + normal.x * nudge;
    let hitY = point.y;
    if (normal.y > 0.5) hitY += nudge;
    else if (normal.y < -0.5) hitY -= nudge;
    else hitY += 0;

    const hitZ = point.z + normal.z * nudge;

    let targetX = alignSnap(hitX, effW, MODULE_SIZE);
    let targetZ = alignSnap(hitZ, effD, MODULE_SIZE);
    let targetY;

    if (Math.abs(normal.y) > 0.5) {
      targetY = Math.round(hitY / BRICK_HEIGHT) * BRICK_HEIGHT;
    } else {
      targetY =
        Math.floor(Math.max(0, point.y + BRICK_HEIGHT / 2) / BRICK_HEIGHT) *
        BRICK_HEIGHT;
    }

    let finalX = targetX;
    let finalY = Math.max(0, targetY);
    let finalZ = targetZ;

    // Floor clamp for moved groups or presets
    if (
      mode === "Move" &&
      movingBrick &&
      movingGroupOriginalBricks.length > 0
    ) {
      let minGroupY = Infinity;
      movingGroupOriginalBricks.forEach((b) => {
        if (b.position[1] < minGroupY) minGroupY = b.position[1];
      });
      const minYRequired = movingBrick.position[1] - minGroupY;
      if (finalY < minYRequired) {
        finalY = minYRequired;
      }
    } else if (activePreset && PRESETS[activePreset]) {
      let minGroupY = Infinity;
      PRESETS[activePreset].filter(isValidBrickData).forEach((b) => {
        if (b.position[1] < minGroupY) minGroupY = b.position[1];
      });
      if (finalY + minGroupY < 0) {
        finalY = -minGroupY;
      }
    }

    const checkPos = (x: number, y: number, z: number) => {
      if (activePreset) {
        if (!PRESETS[activePreset])
          return { valid: false, reason: "invalid-preset" };
        const rotMod = (Math.round(ghostRotation / 90) * 90) % 360;
        const info = getPresetInfo(activePreset);
        const testPresetBricks = PRESETS[activePreset]
          .filter(isValidBrickData)
          .map((b) => {
            let ox = b.position[0] - info.cx;
            let oz = b.position[2] - info.cz;
            let nx = ox, nz = oz;
            if (rotMod === 90 || rotMod === -270) {
              nx = -oz; nz = ox;
            } else if (Math.abs(rotMod) === 180) {
              nx = -ox; nz = -oz;
            } else if (rotMod === 270 || rotMod === -90) {
              nx = oz; nz = -ox;
            }
            return {
              ...b,
              rotation: (((b.rotation || 0) % 360) + rotMod + 360) % 360,
              position: [nx + x, b.position[1] + y, nz + z] as [number, number, number],
            };
          });
        return checkStructureValid(
          bricks,
          testPresetBricks,
          MODULE_SIZE,
          BRICK_HEIGHT,
        );
      } else if (mode === "Move" && movingBrick) {
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

        const currentPivotX = x - rotatedOxA;
        const currentPivotZ = z - rotatedOzA;
        const currentPivotY =
          y - (movingBrick.position[1] - movingGroupPivot[1]);

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
        return checkStructureValid(
          otherBricks,
          testGroupBricks,
          MODULE_SIZE,
          BRICK_HEIGHT,
        );
      } else {
        const testBrickData = {
          id: movingBrickId || "ghost",
          type: activeType,
          position: [x, y, z] as [number, number, number],
          rotation: ghostRotation,
        };
        return checkPlacementValid(
          bricks,
          testBrickData,
          MODULE_SIZE,
          BRICK_HEIGHT,
        );
      }
    };

    let res = checkPos(finalX, finalY, finalZ);

    return [finalX, finalY, finalZ];
  };

  const updateGhostPosition = (point: THREE.Vector3, normal: THREE.Vector3) => {
    setGhostPosition(computePlacementTarget(point, normal));
  };

  const getPlacementHitFromEvent = (e: any) => {
    if (!e.point) return null;
    const p3 = new THREE.Vector3(e.point.x, e.point.y, e.point.z).divideScalar(
      currentVRScale,
    );
    const normal = e.face?.normal
      ? new THREE.Vector3(e.face.normal.x, e.face.normal.y, e.face.normal.z)
      : new THREE.Vector3(0, 1, 0);

    let worldNormal: THREE.Vector3;

    if (e.instanceId !== undefined && e.object instanceof THREE.InstancedMesh) {
      const instanceMatrix = new THREE.Matrix4();
      e.object.getMatrixAt(e.instanceId, instanceMatrix);
      const instanceWorldMatrix = e.object.matrixWorld.clone().multiply(instanceMatrix);

      worldNormal = normal.clone().transformDirection(instanceWorldMatrix).normalize();
    } else {
      worldNormal = normal.clone().transformDirection(e.object.matrixWorld).normalize();
    }

    return { point: p3, normal: worldNormal };
  };

  const updateGhostFromEvent = (e: any) => {
    const hit = getPlacementHitFromEvent(e);
    if (!hit) return false;
    lastPointerHit.current = { point: hit.point, normal: hit.normal };
    updateGhostPosition(hit.point, hit.normal);
    return true;
  };

  useEffect(() => {
    if (lastPointerHit.current) {
      updateGhostPosition(
        lastPointerHit.current.point,
        lastPointerHit.current.normal,
      );
    }
  }, [selectedType, ghostRotation, mode, movingBrickId, activePreset]);

  const handlePointerMove = (e: any) => {
    const isBuilding = mode === "Build";
    const isMoving = mode === "Move" && movingBrickId !== null;
    if (!isBuilding && !isMoving) return;

    if (isMoving && !isDraggingBrick) {
      if (pointerDownPos.current) {
        const coords = getPointerCoords(e);
        const dx = coords.x - pointerDownPos.current.x;
        const dy = coords.y - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = pointerDownPos.current.isTouch ? 20 : 5;
        if (distance > threshold) {
          setIsDraggingBrick(true);
          useLegoStore.getState().setJustSelectedBrick(false); // Also clear click
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
    if (!activePreset || !PRESETS[activePreset]) return [];

    const validPresetBricks = PRESETS[activePreset].filter((b) => {
      const valid = isValidBrickData(b);
      if (!valid)
        console.warn(`Malformed brick found in preset ${activePreset}:`, b);
      return valid;
    });

    const info = getPresetInfo(activePreset);

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
          PRESETS["_clipboard"] = clipboard;
          useLegoStore.getState().loadPreset("_clipboard");
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

  const getPointerCoords = (e: any) => {
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    if (e.nativeEvent) {
      if (typeof e.nativeEvent.clientX === "number")
        return { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
      if (
        e.nativeEvent.changedTouches &&
        e.nativeEvent.changedTouches.length > 0
      ) {
        return {
          x: e.nativeEvent.changedTouches[0].clientX,
          y: e.nativeEvent.changedTouches[0].clientY,
        };
      }
      if (e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
        return {
          x: e.nativeEvent.touches[0].clientX,
          y: e.nativeEvent.touches[0].clientY,
        };
      }
    }
    return { x: 0, y: 0 };
  };

  const isMultiTouchRef = useRef(false);

  const handlePointerDown = (e: any) => {
    // Only stop propagation if we don't want the camera to rotate.
    // For now we allow camera to rotate even when interacting.
    // OrbitControls ignores event if it's not handled.

    // Check multi-touch
    const touchesCount = e.nativeEvent?.touches ? e.nativeEvent.touches.length : 0;
    if (touchesCount >= 2) {
      isMultiTouchRef.current = true;
      pointerDownPos.current = null;
    } else if (touchesCount === 1) {
      isMultiTouchRef.current = false;
    }

    if (mode === "Move" && movingBrick) {
      isBrickInteractionRef.current = true;
    }
    if (e.button === 2 || e.nativeEvent?.type === "contextmenu") return;
    const coords = getPointerCoords(e);
    const isTouch =
      e.pointerType === "touch" ||
      e.nativeEvent?.pointerType === "touch" ||
      e.nativeEvent?.type?.includes("touch") ||
      false;

    if (
      e.object.name === "Grid" &&
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
    const isMoving = mode === "Move" && movingBrickId !== null;
    const isPlacingPreset = activePreset !== null;
    if (isBuilding || isMoving || isPlacingPreset) {
      updateGhostFromEvent(e);
    }
  };

  const executeCommit = (p3: THREE.Vector3, normal: THREE.Vector3) => {
    setIsDraggingBrick(false);

    const now = Date.now();
    if (now - lastPlacementRef.current < 50) return;
    lastPlacementRef.current = now;

    const currentGhostPos = computePlacementTarget(p3, normal);
    setGhostPosition(currentGhostPos);

    const checkCurrentPlacement = () => {
      if (mode === "Move") {
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
      if (!activePreset || !PRESETS[activePreset])
        return { valid: false, reason: "inactive" };
      const info = getPresetInfo(activePreset);
      const testPresetBricks = PRESETS[activePreset]
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
      } else {
        useLegoStore
          .getState()
          .setToastMessage(
            `Preset cannot be placed here. Move it to open supported space.`,
          );
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }
      return;
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
      } else if (status.reason === "overlap") {
        // Auto-stack: only if the tapped position matches exactly in X/Z to existing bricks.
        const ghostAABB = getBrickAABB({
          id: "ghost",
          type: selectedType,
          position: currentGhostPos,
          rotation: ghostRotation,
        });
        const stackCandidates = bricks.filter((b) => {
          const bAABB = getBrickAABB(b);
          return doAABBsOverlap(ghostAABB, bAABB, 0.001);
        });
        if (stackCandidates.length > 0) {
          const highestY = Math.max(
            ...stackCandidates.map((b) => b.position[1]),
          );
          const stackY = highestY + BRICK_HEIGHT;
          addBrick({
            type: selectedType,
            color: selectedColor,
            position: [currentGhostPos[0], stackY, currentGhostPos[2]],
            rotation: ghostRotation,
          });
        }
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
      } else {
        useLegoStore
          .getState()
          .setToastMessage(`Cannot move: ${status.reason}`);
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }

      // Always clear justSelected on any action release
      useLegoStore.getState().setJustSelectedBrick(false);
    }
  };

  executeCommitRef.current = executeCommit;

  const handlePointerUp = (e: any) => {
    isBrickInteractionRef.current = false;

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
      const dx = coords.x - pointerDownPos.current.x;
      const dy = coords.y - pointerDownPos.current.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      const threshold = pointerDownPos.current.isTouch ? 20 : 5;
      isClick = distance <= threshold;
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
      // Special case for dragging to move
      return;
    }

    const hit = getPlacementHitFromEvent(e);
    if (hit) {
      // Only execute commit if it was a real click and not just selecting
      let shouldCommit = true;
      if (
        mode === "Move" &&
        useLegoStore.getState().justSelectedBrick &&
        isClick
      ) {
        shouldCommit = false; // Just selected, wait for next action
        useLegoStore.getState().setJustSelectedBrick(false); // clear it
      }
      if (shouldCommit) {
        executeCommit(hit.point, hit.normal);
      } else {
        setIsDraggingBrick(false);
      }
    }
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
        return { ONE: THREE.TOUCH.DOLLY_PAN as any, TWO: THREE.TOUCH.ROTATE };
    }
  }, [cameraMode]);

  const [isVR, setIsVR] = useState(false);

  useEffect(() => {
    const handleSessionStart = () => setIsVR(true);
    const handleSessionEnd = () => setIsVR(false);
    gl.xr.addEventListener("sessionstart", handleSessionStart);
    gl.xr.addEventListener("sessionend", handleSessionEnd);
    return () => {
      gl.xr.removeEventListener("sessionstart", handleSessionStart);
      gl.xr.removeEventListener("sessionend", handleSessionEnd);
    };
  }, [gl.xr]);

  const gridRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    vrTargetManager.register(gridRef.current);
    return () => vrTargetManager.unregister(gridRef.current);
  }, []);

  return (
    <>
      <color attach="background" args={["#4da6ff"]} />
      <fog attach="fog" args={["#4da6ff", 50, 300]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#002D04" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow={!xrSessionActive}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Suspense fallback={null}>
        {xrSessionActive && !vrReady && <VRDebugVisibilityLayer />}
        {xrSessionActive && vrScale === "human" && (
          <HumanViewLayer
            currentVRScale={currentVRScale}
            sceneGroupRef={sceneGroupRef}
            updateGhostPosition={updateGhostPosition}
          />
        )}
        {xrSessionActive && (
          <VRRadialMenu
            vrScale={vrScale}
            onToggle={toggleScale}
            currentVRScale={currentVRScale}
          />
        )}
      </Suspense>
      <group
          ref={sceneGroupRef}
          scale={currentVRScale}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
        >
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

          {!isScreenshotting && mode === "Build" && !activePreset && (
            <LegoBrick
              id="ghost"
              type={selectedType}
              color={selectedColor}
              position={ghostPosition}
              rotation={ghostRotation}
              isPlacementGhost
            />
          )}

          {!isScreenshotting && (mode === "Move" || mode === "Delete") &&
            movingGroupOriginalBricks.length > 0 && (
              <>
                {/* The ghost preview that follows the mouse */}
                {mode === "Move" &&
                  isDraggingBrick &&
                  Object.entries(groupedGhostGroupBricks).map(
                    ([key, group]) => {
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
                    },
                  )}
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

          {!isScreenshotting && activePreset && (
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
              ref={gridRef}
              name="Grid"
              receiveShadow={!xrSessionActive}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial color="#002D04" />
            </mesh>
            <gridHelper
              args={[40, 500, "#004010", "#003A0A"]}
              position={[0, 0.001, 0]}
            />
          </group>
        </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.15}
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
      <SceneContents xrStore={xrStore} />
    </XR>
  ) : (
    <SceneContents />
  );
};
