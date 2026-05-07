import React, { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
} from "../Store";

export const Scene = ({ xrStore }: { xrStore?: any }) => {
  const { gl, scene, camera } = useThree();

  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (controlsRef.current) {
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

  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);
  const cameraMode = useLegoStore((state) => state.cameraMode);
  const selectedType = useLegoStore((state) => state.selectedType);
  const selectedColor = useLegoStore((state) => state.selectedColor);
  const addBrick = useLegoStore((state) => state.addBrick);
  const activePreset = useLegoStore((state) => state.activePreset);
  const commitPreset = useLegoStore((state) => state.commitPreset);
  const movingBrickId = useLegoStore((state) => state.movingBrickId);
  const setMovingBrickId = useLegoStore((state) => state.setMovingBrickId);
  const updateBrick = useLegoStore((state) => state.updateBrick);
  const isDraggingBrick = useLegoStore((state) => state.isDraggingBrick);
  const setIsDraggingBrick = useLegoStore((state) => state.setIsDraggingBrick);

  const movingBrick = useMemo(() => {
    return bricks.find((b) => b.id === movingBrickId) || null;
  }, [bricks, movingBrickId]);

  const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [ghostRotation, setGhostRotation] = useState<number>(0);

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

  const updateGhostPosition = (point: THREE.Vector3, normal: THREE.Vector3) => {
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
    // On the top surface of a brick, shift up to the top surface
    if (normal.y > 0.5) hitY += nudge;
    else if (normal.y < -0.5) hitY -= nudge;
    else hitY += 0; // If hitting horizontal walls

    // We want the hit point's Y exactly where the normal pushed it OR from point
    // but the brick's position[1] is its bottom face!
    // So if normal.y > 0.5, we hit the top face. We should snap 'up' to Math.floor(hitY / BRICK_HEIGHT) * BRICK_HEIGHT
    // Wait, if point.y is 0.096, hitY is 0.097. floor(0.097 / 0.096) = 1. 1 * 0.096 = 0.096! That is exactly correct.
    const hitZ = point.z + normal.z * nudge;

    let targetX = alignSnap(hitX, effW, MODULE_SIZE);
    let targetZ = alignSnap(hitZ, effD, MODULE_SIZE);
    let targetY;

    if (Math.abs(normal.y) > 0.5) {
      targetY = Math.floor(hitY / BRICK_HEIGHT) * BRICK_HEIGHT;
    } else {
      // Side hit. Center of the brick vertically
      targetY =
        Math.floor(Math.max(0, point.y + BRICK_HEIGHT / 2) / BRICK_HEIGHT) *
        BRICK_HEIGHT;
    }

    let finalX = targetX;
    let finalY = Math.max(0, targetY);
    let finalZ = targetZ;

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

    // Smart surface snapping
    // First, try jumping up on Y
    if (!res.valid && res.reason === "overlap") {
      let testY = finalY;
      while (testY < finalY + BRICK_HEIGHT * 10) {
        // search up to 10 bricks up
        testY += BRICK_HEIGHT;
        const upRes = checkPos(finalX, testY, finalZ);
        if (upRes.valid || upRes.reason !== "overlap") {
          finalY = testY;
          res = upRes;
          break;
        }
      }
    }

    // If still invalid, try nudging X/Z adjacent
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
          // search up
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

    setGhostPosition([finalX, finalY, finalZ]);
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

    e.stopPropagation();
    const point = e.point;
    if (!point) return;

    // Convert to Three Vector3 just in case
    const p3 = new THREE.Vector3(point.x, point.y, point.z);
    const normal = e.face?.normal
      ? new THREE.Vector3(e.face.normal.x, e.face.normal.y, e.face.normal.z)
      : new THREE.Vector3(0, 1, 0);

    // Multiply by object scale/rotation if intersected object has them?
    // R3F gives e.face.normal in local space usually, but e.normal might be world space?
    // Wait, e.intersections[0]?.normal is usually world space but let's just use point + normal.
    // e.face.normal is local... wait! If e.object.rotation is applied, normal needs to be transformed.
    // Drei's events provide e.normal as world space usually, wait no, they don't?
    // Let's stick to e.face.normal, but just transform it!
    const worldNormal = normal
      .clone()
      .transformDirection(e.object.matrixWorld)
      .normalize();

    lastPointerHit.current = { point: p3, normal: worldNormal };
    updateGhostPosition(p3, worldNormal);
  };

  const placementStatus = useMemo(() => {
    if ((mode !== "Build" && mode !== "Move") || activePreset)
      return { valid: false, reason: "inactive" };
    if (mode === "Move" && !movingBrickId)
      return { valid: false, reason: "no-selection" };

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

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
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
    if (e.button === 2 || e.nativeEvent?.type === "contextmenu") return;

    if (pointerDownPos.current) {
      const coords = getPointerCoords(e);
      const dx = coords.x - pointerDownPos.current.x;
      const dy = coords.y - pointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const threshold = pointerDownPos.current.isTouch ? 20 : 5;
      pointerDownPos.current = null;

      if (distance > threshold && !useLegoStore.getState().isDraggingBrick) {
        return; // It was a camera drag
      }
    }

    // If we're dragging a brick, we drop it now regardless of distance
    setIsDraggingBrick(false);

    if (activePreset) {
      if (presetPlacementStatus.valid) {
        commitPreset(ghostPosition, ghostRotation);
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
      if (placementStatus.valid) {
        addBrick({
          type: selectedType,
          color: selectedColor,
          position: ghostPosition,
          rotation: ghostRotation,
        });
      } else {
        let msg = `Cannot place: ${placementStatus.reason}`;
        if (placementStatus.reason === "overlap") {
          msg = "Blocked: overlaps another brick.";
        } else if (placementStatus.reason === "floating") {
          msg = "Blocked: floating unsupported.";
        }
        useLegoStore.getState().setToastMessage(msg);
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }
    } else if (mode === "Move" && movingBrick) {
      if (placementStatus.valid) {
        updateBrick(movingBrick.id, {
          position: ghostPosition,
          rotation: ghostRotation,
        });
        setMovingBrickId(null);
      } else {
        useLegoStore
          .getState()
          .setToastMessage(`Cannot move: ${placementStatus.reason}`);
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
      }
    }
  };

  // Optimization: Group bricks by [type, color] for InstancedMesh rendering
  const groupedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    bricks.forEach((brick) => {
      if (mode === "Move" && movingBrickId === brick.id) return;
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [bricks, mode, movingBrickId]);

  const groupedPresetBricks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    presetBricks.forEach((brick) => {
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [presetBricks]);

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
    switch (cameraMode) {
      case "Orbit":
        return { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
      case "Pan":
        return { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
      case "Zoom":
        return { ONE: THREE.TOUCH.DOLLY_PAN, TWO: THREE.TOUCH.ROTATE };
    }
  }, [cameraMode]);

  return (
    <>
      {xrStore ? (
        <XR store={xrStore}>
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
            <group
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

              {((mode === "Build" && !activePreset) ||
                (mode === "Move" && movingBrick)) && (
                <LegoBrick
                  id="ghost"
                  type={movingBrick ? movingBrick.type : selectedType}
                  color={movingBrick ? movingBrick.color : selectedColor}
                  position={ghostPosition}
                  rotation={ghostRotation}
                  isPlacementGhost
                />
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
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
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
            enabled={!isDraggingBrick}
            mouseButtons={mouseButtons}
            touches={touches}
          />
        </XR>
      ) : (
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
            <group
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

              {((mode === "Build" && !activePreset) ||
                (mode === "Move" && movingBrick)) && (
                <LegoBrick
                  id="ghost"
                  type={movingBrick ? movingBrick.type : selectedType}
                  color={movingBrick ? movingBrick.color : selectedColor}
                  position={ghostPosition}
                  rotation={ghostRotation}
                  isPlacementGhost
                />
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
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
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
            enabled={!isDraggingBrick}
            mouseButtons={mouseButtons}
            touches={touches}
          />
        </>
      )}
    </>
  );
};
