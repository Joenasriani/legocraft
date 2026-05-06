import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { getBrickDimensions, useLegoStore } from '../Store';

interface BrickInstancesProps {
  type: any;
  color: string;
  bricks: any[];
  isGhost?: boolean;
}

const MODULE_SIZE = 0.08;
const BRICK_HEIGHT = 0.096;
const STUD_RADIUS = 0.024;
const STUD_HEIGHT = 0.016;

export const BrickInstances: React.FC<BrickInstancesProps> = ({ type, color, bricks, isGhost }) => {
  const bodyMeshRef = useRef<THREE.InstancedMesh>(null);
  const studMeshRef = useRef<THREE.InstancedMesh>(null);
  const removeBrick = useLegoStore(state => state.removeBrick);
  const setMovingBrickId = useLegoStore(state => state.setMovingBrickId);
  const setToastMessage = useLegoStore(state => state.setToastMessage);
  const mode = useLegoStore(state => state.mode);
  const allBricks = useLegoStore(state => state.bricks);

  const handlePointerDown = (e: any) => {
    if (isGhost) return;
    
    const isSqueeze = e.button === 2 || e.nativeEvent?.type === 'contextmenu';
    if (mode === 'Delete' || mode === 'Move' || isSqueeze) {
      e.stopPropagation();
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
          if (mode === 'Delete' || isSqueeze) {
            removeBrick(brick.id);
          } else if (mode === 'Move') {
            import('../Store').then(({ hasBrickAbove }) => {
              if (hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT)) {
                setToastMessage("Cannot move: brick has another brick above it.");
                setTimeout(() => setToastMessage(null), 3000);
              } else {
                setMovingBrickId(brick.id);
                // Dispatch a custom event to update ghost rotation to match the selected brick
                window.dispatchEvent(new CustomEvent('set-ghost-rotation', { detail: brick.rotation }));
              }
            });
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
      d: dims.d
    };
  }, [type]);

  const bodyGeom = useMemo(() => {
    const geom = new THREE.BoxGeometry(width - 0.002, BRICK_HEIGHT, depth - 0.002);
    geom.translate(0, BRICK_HEIGHT / 2, 0);
    return geom;
  }, [width, depth]);

  const studGeom = useMemo(() => {
    const geom = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12);
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
      toneMapped: !isGhost
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
    const capacity = 5000;
    const numStuds = w * d;
    const studCapacity = capacity * numStuds;
    
    let studIndex = 0;
    
    for (let i = 0; i < capacity; i++) {
      if (i < count) {
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
      } else {
        scale.set(0, 0, 0);
        matrix.makeScale(0, 0, 0);
        bodyMesh.setMatrixAt(i, matrix);
        
        for (let s = 0; s < numStuds; s++) {
          studMesh.setMatrixAt(studIndex, matrix);
          studIndex++;
        }
      }
    }
    
    if (bodyMesh.instanceMatrix) bodyMesh.instanceMatrix.needsUpdate = true;
    if (studMesh.instanceMatrix) studMesh.instanceMatrix.needsUpdate = true;
  }, [bricks, w, d]);

  return (
    <group>
      <instancedMesh 
        ref={bodyMeshRef} 
        args={[bodyGeom, material, 5000]} 
        castShadow={!isGhost} 
        receiveShadow={!isGhost}
        onPointerDown={handlePointerDown}
        onContextMenu={handlePointerDown}
        raycast={isGhost ? () => null : undefined}
      />
      <instancedMesh 
        ref={studMeshRef} 
        args={[studGeom, material, 5000 * w * d]} 
        castShadow={!isGhost} 
        receiveShadow={!isGhost}
        onPointerDown={handlePointerDown}
        onContextMenu={handlePointerDown}
        raycast={isGhost ? () => null : undefined}
      />
    </group>
  );
};
