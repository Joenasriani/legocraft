import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import {
  getBrickDimensions,
  hasBrickStuds,
  useLegoStore,
  hasBrickAbove,
  getGroupBricks,
} from "../Store";
import {
  MODULE_SIZE,
  BRICK_HEIGHT,
  STUD_RADIUS,
  STUD_HEIGHT,
} from "../constants";

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
    useLegoStore.getState().setIsInteractingWithBrick(true);

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
              const groupIds = groupBricks.map((b) => b.id);
              const isBlocked = groupBricks.some((b) =>
                hasBrickAbove(b, allBricks, MODULE_SIZE, BRICK_HEIGHT, groupIds),
              );
              if (isBlocked) {
                setToastMessage(
                  "Cannot delete: one or more bricks in the group have other bricks above them.",
                );
                setTimeout(() => setToastMessage(null), 3000);
              } else {
                useLegoStore.getState().removeBricks(groupIds);
              }
            } else if (selectionMode === "Multi") {
              // In Delete mode, we toggle multi-select too?
              // Or should it delete the selection?
              // The original code was just toggling.
              useLegoStore.getState().toggleMultiSelectBrickId(brick.id);
            } else {
              if (hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT)) {
                setToastMessage(
                  "Cannot delete: brick has another brick above it.",
                );
                setTimeout(() => setToastMessage(null), 3000);
              } else {
                removeBrick(brick.id);
              }
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
              useLegoStore.getState().triggerSetGhostRotation(brick.rotation);
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
              useLegoStore.getState().triggerSetGhostRotation(brick.rotation);
            } else {
              const wasAlreadySelected =
                useLegoStore.getState().movingBrickId === brick.id;
              setMovingBrickId(brick.id);
              e.nativeEvent?.target?.setPointerCapture?.(
                e.nativeEvent.pointerId,
              );
              useLegoStore.getState().setIsDraggingBrick(false);
              if (!wasAlreadySelected) {
                useLegoStore.getState().setJustSelectedBrick(true);
                useLegoStore
                  .getState()
                  .triggerSetGhostRotation(brick.rotation);
                useLegoStore
                  .getState()
                  .triggerSetGhostPosition(brick.position);
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

  // High-water mark to prevent remounting InstancedMesh
  const MAX_CAPACITY = 8192;
  const bodyCapacity = MAX_CAPACITY;
  const studCapacity = MAX_CAPACITY * w * d;

  const bodyGeom = useMemo(() => {
    let geom: THREE.BufferGeometry;
    if (type === "1x1_round_cylinder" || type === "2x2_round_cylinder") {
      const radius = type === "1x1_round_cylinder" ? (MODULE_SIZE / 2) - 0.001 : MODULE_SIZE - 0.001;
      geom = new THREE.CylinderGeometry(radius, radius, BRICK_HEIGHT, 32);
      geom.translate(0, BRICK_HEIGHT / 2, 0);
    } else if (type === "1x1_cone") {
      const radius = (MODULE_SIZE / 2) - 0.001;
      const topRadius = radius * 0.4;
      geom = new THREE.CylinderGeometry(topRadius, radius, BRICK_HEIGHT, 32);
      geom.translate(0, BRICK_HEIGHT / 2, 0);
    } else if (type === "2x2_dome") {
      const radius = MODULE_SIZE - 0.001;
      geom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      // SphereGeometry is centered at origin, top hemisphere goes from y=0 to y=radius
      geom.scale(1, BRICK_HEIGHT / radius, 1);
      // We don't need to translate because the base is at y=0 and it scales up to BRICK_HEIGHT
    } else if (type === "1x2_slope" || type === "2x2_slope") {
      const shape = new THREE.Shape();
      shape.moveTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2);
      const lipHeight = BRICK_HEIGHT * 0.3;
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2 + lipHeight);
      shape.lineTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      const extrudeSettings = {
        depth: width - 0.002,
        bevelEnabled: false,
      };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "curved_corner") {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      shape.lineTo(width / 2 - 0.001, -depth / 2 + 0.001);
      shape.quadraticCurveTo(
        width / 2 - 0.001, depth / 2 - 0.001,
        -width / 2 + 0.001, depth / 2 - 0.001
      );
      shape.lineTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      const extrudeSettings = {
        depth: BRICK_HEIGHT,
        bevelEnabled: false,
      };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
      
      geom.computeBoundingBox();
      const alignCenter = new THREE.Vector3();
      geom.boundingBox?.getCenter(alignCenter);
      geom.translate(-alignCenter.x, -(geom.boundingBox?.min.y || 0), -alignCenter.z);
    } else if (type === "arch") {
      const shape = new THREE.Shape();
      shape.moveTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2);
      const hole = new THREE.Path();
      hole.moveTo(-depth / 2 + MODULE_SIZE, -BRICK_HEIGHT / 2);
      hole.lineTo(-depth / 2 + MODULE_SIZE, 0);
      hole.absarc(0, 0, depth / 2 - MODULE_SIZE, Math.PI, 0, false);
      hole.lineTo(depth / 2 - MODULE_SIZE, -BRICK_HEIGHT / 2);
      hole.lineTo(-depth / 2 + MODULE_SIZE, -BRICK_HEIGHT / 2);
      shape.holes.push(hole);
      const extrudeSettings = { depth: width - 0.002, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "quarter_cylinder") {
      const shape = new THREE.Shape();
      const r = Math.min(width, depth) - 0.001; // use full footprint size as radius, assuming w=d
      shape.moveTo(0, 0);
      shape.lineTo(r, 0);
      shape.absarc(0, 0, r, 0, Math.PI / 2, false);
      shape.lineTo(0, 0);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
      
      geom.computeBoundingBox();
      const alignCenter = new THREE.Vector3();
      geom.boundingBox?.getCenter(alignCenter);
      geom.translate(-alignCenter.x, -(geom.boundingBox?.min.y || 0), -alignCenter.z);
    } else if (type === "half_cylinder") {
      const shape = new THREE.Shape();
      // for w:1 d:2, the radius is depth/2 or width depending on how it's oriented
      const r = depth / 2 - 0.001;
      shape.moveTo(-r, 0);
      shape.lineTo(r, 0);
      shape.absarc(0, 0, r, 0, Math.PI, false);
      shape.lineTo(-r, 0);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
      
      geom.computeBoundingBox();
      const alignCenter = new THREE.Vector3();
      geom.boundingBox?.getCenter(alignCenter);
      geom.translate(-alignCenter.x, -(geom.boundingBox?.min.y || 0), -alignCenter.z);
    } else if (type === "wedge") {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      shape.lineTo(width / 2 - 0.001, -depth / 2 + 0.001);
      shape.lineTo(-width / 2 + 0.001, depth / 2 - 0.001);
      shape.lineTo(-width / 2 + 0.001, -depth / 2 + 0.001);
      const extrudeSettings = { depth: BRICK_HEIGHT, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2);
      
      geom.computeBoundingBox();
      const alignCenter = new THREE.Vector3();
      geom.boundingBox?.getCenter(alignCenter);
      geom.translate(-alignCenter.x, -(geom.boundingBox?.min.y || 0), -alignCenter.z);
    } else if (type === "inverted_slope") {
      const shape = new THREE.Shape();
      shape.moveTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, BRICK_HEIGHT / 2);
      shape.lineTo(depth / 2 - 0.001, -BRICK_HEIGHT / 2);
      const lipHeight = BRICK_HEIGHT * 0.3;
      shape.lineTo(-depth / 2 + 0.001, -BRICK_HEIGHT / 2 + lipHeight);
      shape.lineTo(-depth / 2 + 0.001, BRICK_HEIGHT / 2);
      const extrudeSettings = { depth: width - 0.002, bevelEnabled: false };
      geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "quarter_dome") {
      const radius = Math.min(width, depth) - 0.001;
      geom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI / 2, 0, Math.PI / 2);
      geom.scale(1, BRICK_HEIGHT / radius, 1);
      
      // Compute bounding box to center it like other geometries
      geom.computeBoundingBox();
      const center = new THREE.Vector3();
      geom.boundingBox?.getCenter(center);
      geom.translate(-center.x, -center.y, -center.z);
      
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "half_dome") {
      const radius = Math.max(width, depth) / 2 - 0.001;
      geom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI, 0, Math.PI / 2);
      geom.scale(1, BRICK_HEIGHT / radius, 1);
      
      geom.computeBoundingBox();
      const center = new THREE.Vector3();
      geom.boundingBox?.getCenter(center);
      geom.translate(-center.x, -center.y, -center.z);
      
      geom.translate(0, BRICK_HEIGHT / 2, 0);
      geom.rotateY(Math.PI / 2);
    } else if (type === "corner_slope") {
      // Sloped corner piece
      geom = new THREE.BoxGeometry(width - 0.002, BRICK_HEIGHT, depth - 0.002);
      // Wait we don't need box
      const w = width - 0.002;
      const d = depth - 0.002;
      const h = BRICK_HEIGHT;
      // It's a pyramid basically. 
      const bGeom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
         -w/2, 0, -d/2, // 0: bottom back left
          w/2, 0, -d/2, // 1: bottom back right
          w/2, 0,  d/2, // 2: bottom front right
         -w/2, 0,  d/2, // 3: bottom front left
         -w/2, h, -d/2, // 4: top tip
      ]);
      const indices = [
         0, 1, 4,
         1, 2, 4,
         2, 3, 4,
         3, 0, 4,
         0, 3, 2,  
         0, 2, 1
      ];
      bGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      bGeom.setIndex(indices);
      bGeom.computeVertexNormals();
      geom = bGeom;
    } else {
      geom = new THREE.BoxGeometry(
        width - 0.002,
        BRICK_HEIGHT,
        depth - 0.002,
      );
      geom.translate(0, BRICK_HEIGHT / 2, 0);
    }
    geom.computeBoundsTree();
    return geom;
  }, [width, depth, type]);

  const studGeom = useMemo(() => {
    const geom = new THREE.CylinderGeometry(
      STUD_RADIUS,
      STUD_RADIUS,
      STUD_HEIGHT,
      12,
    );
    geom.translate(0, BRICK_HEIGHT + STUD_HEIGHT / 2, 0);
    geom.computeBoundsTree();
    return geom;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.0,
      metalness: 0.5,
      transparent: !!isGhost,
      opacity: isGhost ? 0.35 : 1,
      depthWrite: !isGhost,
      depthTest: true,
      toneMapped: !isGhost,
      color: isGhost ? "#4da6ff" : color,
    });
  }, [color, isGhost]);

  useEffect(() => {
    return () => {
      bodyGeom.dispose();
      studGeom.dispose();
      material.dispose();
    };
  }, [bodyGeom, studGeom, material]);

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
    const showStuds = hasBrickStuds(type);

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
        if (showStuds) {
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
    }

    if (bodyMesh.instanceMatrix) bodyMesh.instanceMatrix.needsUpdate = true;
    if (studMesh.instanceMatrix) studMesh.instanceMatrix.needsUpdate = true;

    bodyMesh.computeBoundingSphere();
    studMesh.computeBoundingSphere();

    bodyMesh.count = count;
    studMesh.count = showStuds ? Math.max(0, count * w * d) : 0;

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
