import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const removeBrick = useLegoStore(state => state.removeBrick);
  const mode = useLegoStore(state => state.mode);

  const handlePointerDown = (e: any) => {
    if (isGhost) return;
    
    // Deletion: either Delete mode (left click) or Squeeze/Right-Click (button === 2)
    const isSqueeze = e.button === 2 || e.nativeEvent?.type === 'contextmenu';
    if (mode === 'Delete' || isSqueeze) {
      e.stopPropagation();
      const instanceId = e.instanceId;
      if (instanceId !== undefined && bricks[instanceId]) {
        removeBrick(bricks[instanceId].id);
      }
    }
  };
  
  const geometry = useMemo(() => {
    try {
      const { w, d } = getBrickDimensions(type);
      const width = w * MODULE_SIZE;
      const depth = d * MODULE_SIZE;

      const bodyGeom = new THREE.BoxGeometry(width - 0.002, BRICK_HEIGHT, depth - 0.002);
      bodyGeom.translate(0, BRICK_HEIGHT / 2, 0);
      
      const studGeoms: THREE.BufferGeometry[] = [bodyGeom];
      
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
          const studGeom = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 12);
          studGeom.translate(
            (i - (w - 1) / 2) * MODULE_SIZE,
            BRICK_HEIGHT + STUD_HEIGHT / 2,
            (j - (d - 1) / 2) * MODULE_SIZE
          );
          studGeoms.push(studGeom);
        }
      }

      const merged = mergeGeometries(studGeoms, false);
      
      return merged || bodyGeom;
    } catch (e) {
      console.error('Error creating merged brick geometry:', e);
      return new THREE.BoxGeometry(0.08, 0.096, 0.08);
    }
  }, [type]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({ 
      color, 
      roughness: 0.1, 
      metalness: 0.1,
      transparent: !!isGhost,
      opacity: isGhost ? 0.5 : 1,
      depthWrite: !isGhost
    });
  }, [color, isGhost]);

  // Handle matrix updates...
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const euler = new THREE.Euler();
    
    const count = bricks.length;
    const capacity = 5000;
    
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
          mesh.setMatrixAt(i, matrix);
        }
      } else {
        // Hide unused instances
        scale.set(0, 0, 0);
        matrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, matrix);
      }
    }
    
    if (mesh.instanceMatrix) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [bricks]);

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[geometry, material, 5000]} 
      castShadow={!isGhost} 
      receiveShadow={!isGhost}
      onPointerDown={handlePointerDown}
      onContextMenu={handlePointerDown}
      raycast={isGhost ? () => null : undefined}
    />
  );
};
