import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useLegoStore, BrickType, getBrickDimensions, getOccupiedCells } from '../Store';

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

export const LegoBrick: React.FC<LegoBrickProps> = ({ 
  id, type, color, position, rotation: initialRotation, isPlacementGhost 
}) => {
  const { w, d } = getBrickDimensions(type);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [rotation, setRotation] = useState(initialRotation);
  const [previousPosition, setPreviousPosition] = useState(position);
  const [previousRotation, setPreviousRotation] = useState(initialRotation);
  const xrState = useXR();
  const isPresenting = xrState.session !== null;
  const updateBrick = useLegoStore((state) => state.updateBrick);
  const removeBrick = useLegoStore((state) => state.removeBrick);
  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);

  const width = w * MODULE_SIZE;
  const depth = d * MODULE_SIZE;

  // Constants for snapping
  const halfModule = MODULE_SIZE / 2;

  const handleSelectStart = (e: any) => {
    if (mode === 'Delete') {
      e.stopPropagation();
      removeBrick(id);
    } else if (mode === 'Move') {
      e.stopPropagation();
      setPreviousPosition(position);
      setPreviousRotation(rotation);
      setIsGrabbed(true);
      // Optional: attach to controller, but follow standard frame translation works via ray
      e.target?.setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: any) => {
    if (isGrabbed && rigidBodyRef.current) {
      e.stopPropagation();
      // On move, we want the grabbed brick to follow the pointer/ray
      // The `e.point` provides the 3D position where mouse/ray hits an imaginary plane/object
      // This is dynamic, so we just set translation loosely towards the point
      if (e.point) {
        rigidBodyRef.current.setNextKinematicTranslation({
          x: e.point.x,
          y: e.point.y + BRICK_HEIGHT,
          z: e.point.z
        });
      }
    }
  };

  const handleRotate = (e: any) => {
    e.stopPropagation();
    if (isGrabbed) {
      setRotation(prev => (prev + 90) % 360);
    }
  };

  const handleSelectEnd = (e: any) => {
    if (isGrabbed) {
      e.stopPropagation();
      setIsGrabbed(false);
      e.target?.releasePointerCapture?.(e.pointerId);
      
      if (rigidBodyRef.current) {
        const currentPos = rigidBodyRef.current.translation();
        
        // Snap to grid on release
        const snappedX = Math.round(currentPos.x / halfModule) * halfModule;
        const snappedY = Math.max(0, Math.round(currentPos.y / BRICK_HEIGHT) * BRICK_HEIGHT);
        const snappedZ = Math.round(currentPos.z / halfModule) * halfModule;
        
        // Snap rotation to 90deg
        const snappedRot = Math.round(rotation / 90) * 90;
        
        // Check for overlap
        const EPSILON = 0.01;
        const potentialBrickData = {
          id, type, color,
          position: [snappedX, snappedY, snappedZ] as [number, number, number],
          rotation: snappedRot
        };
        
        const testCells = getOccupiedCells(potentialBrickData, MODULE_SIZE);
        const overlap = bricks.some(b => {
          if (b.id === id) return false; // Don't check against self
          if (Math.abs(b.position[1] - snappedY) > EPSILON) return false;
          
          const bCells = getOccupiedCells(b, MODULE_SIZE);
          return testCells.some(tc => 
            bCells.some(bc => 
              Math.abs(tc.x - bc.x) < EPSILON && 
              Math.abs(tc.z - bc.z) < EPSILON
            )
          );
        });

        if (overlap) {
          // Revert to previous
          rigidBodyRef.current.setTranslation({ x: previousPosition[0], y: previousPosition[1], z: previousPosition[2] }, true);
          const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (previousRotation * Math.PI) / 180, 0));
          rigidBodyRef.current.setRotation(quat, true);
          setRotation(previousRotation);
          updateBrick(id, { 
            position: previousPosition,
            rotation: previousRotation
          });
        } else {
          // Accept new position
          rigidBodyRef.current.setTranslation({ x: snappedX, y: snappedY, z: snappedZ }, true);
          const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (snappedRot * Math.PI) / 180, 0));
          rigidBodyRef.current.setRotation(quat, true);
          
          updateBrick(id, { 
            position: [snappedX, snappedY, snappedZ],
            rotation: snappedRot 
          });
        }
      }
    }
  };

  // WebXR specific pointer/hand tracking is handled natively by R3F events
  // When grabbing, if we want strict controller lock, we could query the XR controller,
  // but setNextKinematicTranslation via handlePointerMove works well cross-device.

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
      onPointerMove={handlePointerMove}
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
