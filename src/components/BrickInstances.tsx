import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import {
  getBrickDimensions,
  useLegoStore,
  hasBrickAbove,
  getGroupBricks,
} from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT, STUD_RADIUS, STUD_HEIGHT } from "../constants";

import { vrTargetManager } from "../lib/vrTargets";

interface BrickInstancesProps {
  type: any;
  color: string;
  bricks: any[];
  isGhost?: boolean;
}

export const BrickInstances: React.FC<BrickInstancesProps> = ({
  type,
  color,
  bricks,
  isGhost,
}) => {
  const bodyMeshRef = useRef<THREE.InstancedMesh>(null);
  const studMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!isGhost) {
      vrTargetManager.register(bodyMeshRef.current);
      vrTargetManager.register(studMeshRef.current);
      return () => {
        vrTargetManager.unregister(bodyMeshRef.current);
        vrTargetManager.unregister(studMeshRef.current);
      };
    }
  }, [isGhost, bricks.length]);
  const removeBrick = useLegoStore((state) => state.removeBrick);
  const setMovingBrickId = useLegoStore((state) => state.setMovingBrickId);
  const setToastMessage = useLegoStore((state) => state.setToastMessage);
  const mode = useLegoStore((state) => state.mode);
  const allBricks = useLegoStore((state) => state.bricks);

  const handlePointerDown = (e: any) => {
    if (isGhost) return;

    const isSqueeze = e.button === 2 || e.nativeEvent?.type === "contextmenu";
    if (mode === "Delete" || mode === "Move" || isSqueeze) {
      if (mode === "Delete" || isSqueeze) {
        e.stopPropagation();
      }
      const instanceId = e.instanceId;
      if (instanceId !== undefined) {
        // If they click on body or stud, the IDs map predictably
        // For stud mesh, instanceId is (brickIndex * w * d) + some offset
        // For body mesh, instanceId is brickIndex
        const isStud = e.object === studMeshRef.current;
        let brickIndex = instanceId;

        if (isStud) {
          const { w, d } = getBrickDimensions(type);
          brickIndex = Math.floor(instanceId / (w * d));
        }

        const brick = bricks[brickIndex];
        if (brick) {
          const selectionMode = useLegoStore.getState().selectionMode;
          if (mode === "Delete" || isSqueeze) {
            if (selectionMode === "Group") {
              const groupBricks = getGroupBricks(brick, allBricks);
              useLegoStore
                .getState()
                .removeBricks(groupBricks.map((b) => b.id));
            } else if (selectionMode === "Multi") {
              useLegoStore.getState().toggleMultiSelectBrickId(brick.id);
            } else {
              removeBrick(brick.id);
            }
          } else if (mode === "Move") {
            if (selectionMode === "Group") {
              // We just set the anchor, and the Scene handles computing the rest of the group!
              setMovingBrickId(brick.id);
              e.nativeEvent?.target?.setPointerCapture?.(
                e.nativeEvent.pointerId,
              );
              useLegoStore.getState().setIsDraggingBrick(false);
              useLegoStore.getState().setJustSelectedBrick(true);
              window.dispatchEvent(
                new CustomEvent("set-ghost-rotation", {
                  detail: brick.rotation,
                }),
              );
            } else if (selectionMode === "Multi") {
              const stateBefore = useLegoStore.getState();
              const isTouch =
                e.pointerType === "touch" ||
                e.nativeEvent?.pointerType === "touch" ||
                e.nativeEvent?.type?.includes("touch");

              if (isTouch) {
                stateBefore.toggleMultiSelectBrickId(brick.id);
              } else {
                if (e.shiftKey) {
                  stateBefore.toggleMultiSelectBrickId(brick.id);
                } else {
                  if (!stateBefore.multiSelectedBrickIds.includes(brick.id)) {
                    stateBefore.setMultiSelectedBrickIds([brick.id]);
                  }
                }
              }

              const stateAfter = useLegoStore.getState();
              const isNowSelected = stateAfter.multiSelectedBrickIds.includes(
                brick.id,
              );
              if (isNowSelected) {
                setMovingBrickId(brick.id);
              } else if (stateBefore.movingBrickId === brick.id) {
                // If it was the anchor, find a new anchor or clear it
                const newAnchor =
                  stateAfter.multiSelectedBrickIds[
                    stateAfter.multiSelectedBrickIds.length - 1
                  ];
                setMovingBrickId(newAnchor || null);
              }
              e.nativeEvent?.target?.setPointerCapture?.(
                e.nativeEvent.pointerId,
              );
              useLegoStore.getState().setIsDraggingBrick(false);
              useLegoStore.getState().setJustSelectedBrick(true);
              window.dispatchEvent(
                new CustomEvent("set-ghost-rotation", {
                  detail: brick.rotation,
                }),
              );
            } else {
              if (hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT)) {
                setToastMessage(
                  "Cannot move: brick has another brick above it.",
                );
                setTimeout(() => setToastMessage(null), 3000);
              } else {
                const wasAlreadySelected = useLegoStore.getState().movingBrickId === brick.id;
                setMovingBrickId(brick.id);
                e.nativeEvent?.target?.setPointerCapture?.(
                  e.nativeEvent.pointerId,
                );
                useLegoStore.getState().setIsDraggingBrick(false);
                if (!wasAlreadySelected) {
                  useLegoStore.getState().setJustSelectedBrick(true);
                  window.dispatchEvent(
                    new CustomEvent("set-ghost-rotation", {
                      detail: brick.rotation,
                    }),
                  );
                  window.dispatchEvent(
                    new CustomEvent("set-ghost-position", {
                      detail: brick.position,
                    }),
                  );
                }
              }
            }
          }
        }
      }
    }
  };

  const { width, depth, w, d } = useMemo(() => {
    const dims = getBrickDimensions(type);
    return {
      width: dims.w * MODULE_SIZE,
      depth: dims.d * MODULE_SIZE,
      w: dims.w,
      d: dims.d,
    };
  }, [type]);

  const getCapacityTier = (count: number) => {
    if (count <= 64) return 64;
    if (count <= 128) return 128;
    if (count <= 256) return 256;
    if (count <= 512) return 512;
    return Math.ceil(count / 256) * 256;
  };

  const bodyCapacity = getCapacityTier(bricks.length);
  const studCapacity = Math.max(1, bodyCapacity * w * d);

  const bodyGeom = useMemo(() => {
    const geom = new THREE.BoxGeometry(
      width - 0.002,
      BRICK_HEIGHT,
      depth - 0.002,
    );
    geom.translate(0, BRICK_HEIGHT / 2, 0);
    return geom;
  }, [width, depth]);

  const studGeom = useMemo(() => {
    const geom = new THREE.CylinderGeometry(
      STUD_RADIUS,
      STUD_RADIUS,
      STUD_HEIGHT,
      12,
    );
    geom.translate(0, BRICK_HEIGHT + STUD_HEIGHT / 2, 0);
    return geom;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.1,
      metalness: 0.1,
      transparent: !!isGhost,
      opacity: isGhost ? 0.3 : 1,
      depthWrite: !isGhost,
      depthTest: true,
      toneMapped: !isGhost,
    });
  }, [color, isGhost]);

  useEffect(() => {
    const bodyMesh = bodyMeshRef.current;
    const studMesh = studMeshRef.current;
    if (!bodyMesh || !studMesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const euler = new THREE.Euler();

    const studMatrix = new THREE.Matrix4();
    const studPos = new THREE.Vector3();

    const count = bricks.length;

    let studIndex = 0;

    for (let i = 0; i < count; i++) {
      const brick = bricks[i];
      if (brick && brick.position) {
        const [px, py, pz] = brick.position;
        const rotY = (brick.rotation || 0) * (Math.PI / 180);

        position.set(px, py, pz);
        euler.set(0, rotY, 0);
        quaternion.setFromEuler(euler);
        scale.set(1, 1, 1);

        matrix.compose(position, quaternion, scale);
        bodyMesh.setMatrixAt(i, matrix);

        // Place studs
        for (let x = 0; x < w; x++) {
          for (let z = 0; z < d; z++) {
            const localX = (x - (w - 1) / 2) * MODULE_SIZE;
            const localZ = (z - (d - 1) / 2) * MODULE_SIZE;

            studPos.set(localX, 0, localZ);
            studPos.applyQuaternion(quaternion);
            studPos.add(position);

            studMatrix.compose(studPos, quaternion, scale);
            studMesh.setMatrixAt(studIndex, studMatrix);
            studIndex++;
          }
        }
      }
    }

    if (bodyMesh.instanceMatrix) bodyMesh.instanceMatrix.needsUpdate = true;
    if (studMesh.instanceMatrix) studMesh.instanceMatrix.needsUpdate = true;
    
    bodyMesh.computeBoundingSphere();
    studMesh.computeBoundingSphere();

    bodyMesh.count = count;
    studMesh.count = Math.max(0, count * w * d);

    // Store bricks on userData so custom raycasters can retrieve them
    bodyMesh.userData.bricks = bricks;
    bodyMesh.userData.w = w;
    bodyMesh.userData.d = d;
    bodyMesh.userData.isGhost = isGhost;
    studMesh.userData.bricks = bricks;
    studMesh.userData.w = w;
    studMesh.userData.d = d;
    studMesh.userData.isStud = true;
    studMesh.userData.isGhost = isGhost;
  }, [bricks, w, d, isGhost]);

  return (
    <group>
      <instancedMesh
        key={`body-${bodyCapacity}`}
        ref={bodyMeshRef}
        name="BrickBodyInstanced"
        args={[bodyGeom, material, bodyCapacity]}
        castShadow={!isGhost}
        receiveShadow={!isGhost}
        onPointerDown={isGhost ? undefined : handlePointerDown}
        onContextMenu={isGhost ? undefined : handlePointerDown}
        raycast={isGhost ? () => null : undefined}
      />
      <instancedMesh
        key={`stud-${studCapacity}`}
        ref={studMeshRef}
        name="BrickStudsInstanced"
        args={[studGeom, material, studCapacity]}
        castShadow={!isGhost}
        receiveShadow={!isGhost}
        onPointerDown={isGhost ? undefined : handlePointerDown}
        onContextMenu={isGhost ? undefined : handlePointerDown}
        raycast={isGhost ? () => null : undefined}
      />
    </group>
  );
};
