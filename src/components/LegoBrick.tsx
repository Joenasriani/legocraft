import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useLegoStore, BrickType } from '../Store';

interface LegoBrickProps {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number;
  isPlacementGhost?: boolean;
}

const MODULE_SIZE = 0.08; // 8cm per module - better for hand tracking
const BRICK_HEIGHT = 0.096; // Standard lego proportion (1.2x width)
const STUD_RADIUS = 0.024;
const STUD_HEIGHT = 0.016;

const getBrickDimensions = (type: BrickType) => {
  switch (type) {
    case '1x1': return { w: 1, d: 1 };
    case '1x2': return { w: 1, d: 2 };
    case '2x2': return { w: 2, d: 2 };
    case '2x3': return { w: 2, d: 3 };
    case '2x4': return { w: 2, d: 4 };
    default: return { w: 1, d: 1 };
  }
};

export const LegoBrick: React.FC<LegoBrickProps> = ({ 
  id, type, color, position, rotation: initialRotation, isPlacementGhost 
}) => {
  const { w, d } = getBrickDimensions(type);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [rotation, setRotation] = useState(initialRotation);
  const xrState = useXR();
  const isPresenting = xrState.session !== null;
  const updateBrick = useLegoStore((state) => state.updateBrick);
  const removeBrick = useLegoStore((state) => state.removeBrick);
  const mode = useLegoStore((state) => state.mode);

  const width = w * MODULE_SIZE;
  const depth = d * MODULE_SIZE;

  // Constants for snapping
  const halfModule = MODULE_SIZE / 2;

  const handleSelectStart = (e: any) => {
    e.stopPropagation();
    if (mode === 'Delete') {
      removeBrick(id);
      return;
    }
    if (mode === 'Move') {
      setIsGrabbed(true);
    }
  };

  const handleRotate = (e: any) => {
    if (isGrabbed) {
      setRotation(prev => (prev + 90) % 360);
    }
  };

  const handleSelectEnd = (e: any) => {
    if (isGrabbed) {
      setIsGrabbed(false);
      
      if (rigidBodyRef.current) {
        const currentPos = rigidBodyRef.current.translation();
        
        // Snap to grid
        const snappedX = Math.round(currentPos.x / halfModule) * halfModule;
        const snappedY = Math.max(0, Math.round(currentPos.y / BRICK_HEIGHT) * BRICK_HEIGHT);
        const snappedZ = Math.round(currentPos.z / halfModule) * halfModule;
        
        // Snap rotation to 90deg
        const snappedRot = Math.round(rotation / 90) * 90;
        
        rigidBodyRef.current.setTranslation({ x: snappedX, y: snappedY, z: snappedZ }, true);
        
        // Convert deg to quaternion for Y-axis
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (snappedRot * Math.PI) / 180, 0));
        rigidBodyRef.current.setRotation(quat, true);
        
        updateBrick(id, { 
          position: [snappedX, snappedY, snappedZ],
          rotation: snappedRot 
        });
      }
    }
  };

  // Follow hand/controller transform when grabbed
  useFrame((state) => {
    if (isGrabbed && isPresenting) {
      const controller = state.gl.xr.getController(0);
      if (controller && rigidBodyRef.current) {
        const handPos = new THREE.Vector3();
        controller.getWorldPosition(handPos);
        rigidBodyRef.current.setNextKinematicTranslation(handPos);
      }
    }
  });

  // Listener for Punch All
  useEffect(() => {
    const handlePunch = () => {
      if (rigidBodyRef.current && !isGrabbed && !isPlacementGhost) {
        rigidBodyRef.current.applyImpulse({
          x: (Math.random() - 0.5) * 5,
          y: Math.random() * 10 + 5,
          z: (Math.random() - 0.5) * 5
        }, true);
      }
    };
    window.addEventListener('punch-all', handlePunch);
    return () => window.removeEventListener('punch-all', handlePunch);
  }, [isGrabbed, isPlacementGhost]);

  return (
    <group 
      onPointerDown={handleSelectStart} 
      onPointerUp={handleSelectEnd}
      onContextMenu={handleRotate} // Use right click to rotate on desktop
    >
      <RigidBody 
        ref={rigidBodyRef}
        type={isGrabbed || isPlacementGhost ? "kinematicPosition" : "dynamic"}
        colliders={false}
        position={position}
        rotation={[0, (rotation * Math.PI) / 180, 0]}
        enabledRotations={[false, true, false]}
      >
        <group>
          {/* Main Body */}
          <RoundedBox
            args={[width - 0.002, BRICK_HEIGHT, depth - 0.002]}
            radius={0.004}
            smoothness={4}
          >
            <meshStandardMaterial 
              color={color} 
              roughness={0.1} 
              metalness={0.1}
              transparent={isPlacementGhost}
              opacity={isPlacementGhost ? 0.4 : 1}
              envMapIntensity={1.5}
            />
          </RoundedBox>

          {/* Studs */}
          {Array.from({ length: w }).map((_, i) => (
            Array.from({ length: d }).map((_, j) => (
              <mesh 
                key={`${i}-${j}`} 
                position={[
                  (i - (w - 1) / 2) * MODULE_SIZE,
                  BRICK_HEIGHT / 2 + STUD_HEIGHT / 2,
                  (j - (d - 1) / 2) * MODULE_SIZE
                ]}
              >
                <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
                <meshStandardMaterial 
                  color={color} 
                  roughness={0.1} 
                  metalness={0.1}
                  transparent={isPlacementGhost}
                  opacity={isPlacementGhost ? 0.4 : 1}
                />
              </mesh>
            ))
          ))}
        </group>
        
        {/* Simplified Collider */}
        <CuboidCollider args={[width / 2, BRICK_HEIGHT / 2, depth / 2]} />
      </RigidBody>
    </group>
  );
};
