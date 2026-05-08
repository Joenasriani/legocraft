import React, { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { XR } from "@react-three/xr";
import * as THREE from "three";
import { LegoBrick } from "./LegoBrick";
import { BrickInstances } from "./BrickInstances";
import {
  useLegoStore,
  checkPlacementValid,
  checkStructureValid,
  getBrickDimensions,
  PRESETS,
  isValidBrickData,
  BrickData,
  getGroupBricks,
  LEGO_COLORS,
  getBrickAABB,
  doAABBsOverlap,
} from "../Store";

import { VRRadialMenu } from "./VRRadialMenu";

import { HumanViewLayer, MicroViewLayer } from "./VRViewLayers";

export type VRScaleMode = 'human' | 'micro';

const VR_SCALE_VALUES: Record<VRScaleMode, number> = {
  human: 1.0,
  micro: 17.5,
};

const SceneContents = ({ xrStore }: { xrStore?: any }) => {
  const { gl, scene, camera } = useThree();
  const [vrScale, setVrScale] = useState<VRScaleMode>('human');
  const [xrSessionActive, setXrSessionActive] = useState(false);
  const currentVRScale = xrSessionActive ? VR_SCALE_VALUES[vrScale] : 1.0;

  useEffect(() => {
    if (!xrStore) return;
    return xrStore.subscribe((state: any) => {
      setXrSessionActive(!!state.session);
      if (!state.session) {
          setVrScale('human');
      }
    });
  }, [xrStore]);

  useEffect(() => {
    if (xrSessionActive) {
       // Push player back and up slightly so build is in front
       // Give it a tiny delay to ensure session is active
       setTimeout(() => teleportPlayer({ x: 0, y: 0.5, z: 0.8 }), 100);
    }
  }, [xrSessionActive]);

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
  const isCameraLocked = useLegoStore((state) => state.isCameraLocked);

  const controlsRef = useRef<any>(null);
  const isBrickInteractionRef = useRef(false);

  const handlePointerUpRef = useRef<any>(null);

  useEffect(() => {
    handlePointerUpRef.current = handlePointerUp;
  });

  useEffect(() => {
    const handleVRAction = (e: any) => {
      if (e.detail.type === 'trigger') {
         pointerDownPos.current = null;
         if (handlePointerUpRef.current) {
             handlePointerUpRef.current({ stopPropagation: () => {}, clientX: 0, clientY: 0, button: 0 });
         }
      }
    }
    window.addEventListener('human-view-action', handleVRAction);
    return () => window.removeEventListener('human-view-action', handleVRAction);
  }, []);

  useFrame((state) => {
    if (controlsRef.current) {
      if (isCameraLocked) {
        controlsRef.current.enabled = false;
      } else {
        controlsRef.current.enabled = !isBrickInteractionRef.current && (mode === 'Move' ? !isDraggingBrick : mode !== 'Build' && mode !== 'Delete');
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
      // Must render first to ensure canvas has content
      gl.render(scene, camera);
      const link = document.createElement("a");
      link.download = "brickxr-screenshot.png";
      link.href = gl.domElement.toDataURL("image/png");
      link.click();
    };
    window.addEventListener("take-screenshot", onScreenshot);
    return () => window.removeEventListener("take-screenshot", onScreenshot);
  }, [gl, scene, camera]);

  const movingBrick = useMemo(() => {
    return bricks.find((b) => b.id === movingBrickId) || null;
  }, [bricks, movingBrickId]);

  const movingGroupOriginalBricks = useMemo(() => {
    if (!movingBrick) return [];
    if (selectionMode === "Single") return [movingBrick];
    return getGroupBricks(movingBrick, bricks);
  }, [movingBrick, bricks, selectionMode]);

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

  async function teleportPlayer(offsetPosition: { x: number; y: number; z: number }) {
    if (!gl.xr.isPresenting) return;
    const session = gl.xr.getSession();
    if (!session) return;
    const refSpace = await session.requestReferenceSpace('local-floor');
    const transform = new XRRigidTransform(
      offsetPosition,
      { x: 0, y: 0, z: 0, w: 1 }
    );
    gl.xr.setReferenceSpace(refSpace.getOffsetReferenceSpace(transform));
  }

  const toggleScale = () => {
    setVrScale((v) => {
      if (v === 'human') {
        teleportPlayer({ x: 0, y: 0, z: -0.15 });
        return 'micro';
      } else {
        teleportPlayer({ x: 0, y: 0, z: 0 });
        return 'human';
      }
    });
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

  const computeGhostPosition = (point: THREE.Vector3, normal: THREE.Vector3): [number, number, number] => {
    const activeType = movingBrick ? movingBrick.type : selectedType;
    const { w, d } = getBrickDimensions(activeType);
    const rot = Math.round(ghostRotation / 90) % 4;
    const isRot = rot === 1 || rot === 3 || rot === -1 || rot === -3;
    const effW = isRot ? d : w;
    const effD = isRot ? w : d;

    const alignSnap = (val: number, count: number, step: number) => {
      if (count % 2 === 1) {
        return Math.round(val / step) * step;
      } else {
        return Math.floor(val / step) * step + step / 2;
      }
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
      targetY = Math.floor(hitY / BRICK_HEIGHT) * BRICK_HEIGHT;
    } else {
      targetY =
        Math.floor(Math.max(0, point.y + BRICK_HEIGHT / 2) / BRICK_HEIGHT) *
        BRICK_HEIGHT;
    }

    let finalX = targetX;
    let finalY = Math.max(0, targetY);
    let finalZ = targetZ;

    // Floor clamp for moved groups or presets
    if (mode === "Move" && movingBrick && movingGroupOriginalBricks.length > 0) {
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
        const testPresetBricks = PRESETS[activePreset]
          .filter(isValidBrickData)
          .map((b) => ({
            ...b,
            position: [
              b.position[0] + x,
              b.position[1] + y,
              b.position[2] + z,
            ] as [number, number, number],
          }));
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
            rotation: ((b.rotation || 0) + rotMod) % 360,
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

    if (!res.valid && res.reason === "overlap") {
      let testY = finalY;
      while (testY < finalY + BRICK_HEIGHT * 10) {
        testY += BRICK_HEIGHT;
        const upRes = checkPos(finalX, testY, finalZ);
        if (upRes.valid || upRes.reason !== "overlap") {
          finalY = testY;
          res = upRes;
          break;
        }
      }
    }

    if (!res.valid && res.reason === "overlap") {
      const offsets = [
        [MODULE_SIZE * 2, 0],
        [-MODULE_SIZE * 2, 0],
        [0, MODULE_SIZE * 2],
        [0, -MODULE_SIZE * 2],
        [MODULE_SIZE * 4, 0],
        [-MODULE_SIZE * 4, 0],
        [0, MODULE_SIZE * 4],
        [0, -MODULE_SIZE * 4],
      ];
      let bestX = finalX;
      let bestZ = finalZ;
      let bestY = finalY;
      let found = false;

      for (const [ox, oz] of offsets) {
        let tx = finalX + ox;
        let tz = finalZ + oz;
        let ty = finalY;

        let subRes = checkPos(tx, ty, tz);

        if (!subRes.valid && subRes.reason === "overlap") {
          let testY = ty;
          while (testY < ty + BRICK_HEIGHT * 6) {
            testY += BRICK_HEIGHT;
            const upRes = checkPos(tx, testY, tz);
            if (upRes.valid || upRes.reason !== "overlap") {
              subRes = upRes;
              ty = testY;
              break;
            }
          }
        }

        if (subRes.valid || subRes.reason !== "overlap") {
          bestX = tx;
          bestY = ty;
          bestZ = tz;
          found = true;
          break;
        }
      }

      if (found) {
        finalX = bestX;
        finalY = bestY;
        finalZ = bestZ;
      }
    }

    return [finalX, finalY, finalZ];
  };

  const updateGhostPosition = (point: THREE.Vector3, normal: THREE.Vector3) => {
    setGhostPosition(computeGhostPosition(point, normal));
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
        } else {
           return; // wait
        }
      } else {
        // pointer not down.
        // We shouldn't track mouse unless we are in some active drag mode
        // Wait, for mobile, tapping empty space moves ghost position without dragging?
        // Let's only ignore if it's touch, or restrict tracking
        // Actually we allow pointerMove to update ghost even if button not held if it's PC.
      }
    }

    e.stopPropagation();
    const point = e.point;
    if (!point) return;

    // Convert to Three Vector3 just in case, and unscale the coordinates (CRITICAL)
    const p3 = new THREE.Vector3(point.x, point.y, point.z).divideScalar(currentVRScale);
    const normal = e.face?.normal
      ? new THREE.Vector3(e.face.normal.x, e.face.normal.y, e.face.normal.z)
      : new THREE.Vector3(0, 1, 0);

    const worldNormal = normal
      .clone()
      .transformDirection(e.object.matrixWorld)
      .normalize();

    lastPointerHit.current = { point: p3, normal: worldNormal };
    updateGhostPosition(p3, worldNormal);
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
        rotation: ((b.rotation || 0) + rotMod) % 360,
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

    return validPresetBricks.map((b) => {
      let ox = b.position[0];
      let oz = b.position[2];
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
        rotation: ((b.rotation || 0) + rotMod) % 360,
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
      if (e.key === "Escape" && useLegoStore.getState().activePreset) {
        useLegoStore.getState().loadPreset(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    e.stopPropagation();

    // Check multi-touch
    if (e.nativeEvent?.touches && e.nativeEvent.touches.length >= 2) {
      isMultiTouchRef.current = true;
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
    pointerDownPos.current = { x: coords.x, y: coords.y, isTouch };
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    isBrickInteractionRef.current = false;

    const touchesCount = e.nativeEvent?.touches ? e.nativeEvent.touches.length : 0;
    const wasMultiTouch = isMultiTouchRef.current;
    
    if (touchesCount === 0) {
      isMultiTouchRef.current = false; // reset when all fingers off
    }

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

    // Sync compute position if we have a point
    let currentGhostPos = ghostPosition;
    if (e.point && e.face?.normal) {
        const p3 = new THREE.Vector3(e.point.x, e.point.y, e.point.z).divideScalar(currentVRScale);
        const normal = new THREE.Vector3(e.face.normal.x, e.face.normal.y, e.face.normal.z)
          .transformDirection(e.object.matrixWorld).normalize();
        
        currentGhostPos = computeGhostPosition(p3, normal);
        setGhostPosition(currentGhostPos);
    }

    // Now re-calculate validation synchronously for currentGhostPos
    
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
            rotation: ((b.rotation || 0) + rotMod) % 360,
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
          status: checkStructureValid(otherBricks, testGroupBricks, MODULE_SIZE, BRICK_HEIGHT),
          ghostGroupBricks: testGroupBricks
        };
      } else {
        const testBrickData = {
          id: "ghost",
          type: selectedType,
          position: currentGhostPos as [number, number, number],
          rotation: ghostRotation,
        };
        return {
          status: checkPlacementValid(bricks, testBrickData, MODULE_SIZE, BRICK_HEIGHT),
          ghostGroupBricks: []
        };
      }
    };

    const checkCurrentPresetPlacement = () => {
        if (!activePreset || !PRESETS[activePreset]) return { valid: false, reason: "inactive" };
        const testPresetBricks = PRESETS[activePreset]
          .filter(isValidBrickData)
          .map((b) => {
            let ox = b.position[0];
            let oz = b.position[2];
            let nx = ox, nz = oz;
      
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
              rotation: ((b.rotation || 0) + rotMod) % 360,
              position: [
                nx + currentGhostPos[0],
                b.position[1] + currentGhostPos[1],
                nz + currentGhostPos[2],
              ] as [number, number, number],
            };
          });
        return checkStructureValid(bricks, testPresetBricks, MODULE_SIZE, BRICK_HEIGHT);
    };

    // If we're dragging a brick, we drop it now regardless of distance
    setIsDraggingBrick(false);

    const now = Date.now();
    if (now - lastPlacementRef.current < 50) return;
    lastPlacementRef.current = now;

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
        // Wait, if we tap the exact X/Z it should stack. If not, it shouldn't auto-stack on random previous position.
        // `currentGhostPos` is already the computed position for the TAP. So it's safe to auto-stack at currentGhostPos.X / Z !
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
          const highestY = Math.max(...stackCandidates.map((b) => b.position[1]));
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

      if (isClick && justSelected) {
        // Just selected the brick with a click. Do not commit move yet.
      } else {
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
      }
      // Always clear justSelected on any pointer release while moving
      useLegoStore.getState().setJustSelectedBrick(false);
    }
  };

  // Optimization: Group bricks by [type, color] for InstancedMesh rendering
  const groupedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    const movingIds = new Set(movingGroupOriginalBricks.map((b) => b.id));
    bricks.forEach((brick) => {
      if (mode === "Move" && movingIds.has(brick.id)) return;
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [bricks, mode, movingGroupOriginalBricks]);

  const groupedOriginalSelectedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    if (mode === "Move" && movingGroupOriginalBricks.length > 0) {
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

  return (
    <>
      <color attach="background" args={["#4da6ff"]} />
      <fog attach="fog" args={["#4da6ff", 50, 300]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight
        intensity={0.6}
        color="#ffffff"
        groundColor="#002D04"
      />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
      />

      <Suspense fallback={null}>
        {xrSessionActive && vrScale === 'human' && (
          <HumanViewLayer
             currentVRScale={currentVRScale}
             sceneGroupRef={sceneGroupRef}
             updateGhostPosition={updateGhostPosition}
          />
        )}
        {xrSessionActive && vrScale === 'micro' && (
          <MicroViewLayer />
        )}
        {xrSessionActive && (
          <VRRadialMenu vrScale={vrScale} onToggle={toggleScale} currentVRScale={currentVRScale} />
        )}
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

          {mode === "Build" && !activePreset && (
            <LegoBrick
              id="ghost"
              type={selectedType}
              color={selectedColor}
              position={ghostPosition}
              rotation={ghostRotation}
              isPlacementGhost
            />
          )}

          {mode === "Move" && movingBrick && (
            <>
              {/* The ghost preview that follows the mouse */}
              {isDraggingBrick && Object.entries(groupedGhostGroupBricks).map(
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

          {activePreset && (
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
            </>
          )}

          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#002D04" />
          </mesh>
        </group>
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.15}
        enabled={!isCameraLocked && !isVR}
        mouseButtons={mouseButtons as any}
        touches={touches as any}
      />
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
