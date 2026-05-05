import React, { useState } from 'react';
import * as THREE from 'three';
import { useLegoStore, BrickType, getBrickDimensions } from '../Store';

interface LegoBrickProps {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number;
  isPlacementGhost?: boolean;
  hideMesh?: boolean;
}

const MODULE_SIZE = 0.08; // 8cm per module - better for hand tracking
const BRICK_HEIGHT = 0.096; // Standard lego proportion (1.2x width)
const STUD_RADIUS = 0.024;
const STUD_HEIGHT = 0.016;

export const LegoBrick: React.FC<LegoBrickProps> = ({ 
  id, type, color, position, rotation, isPlacementGhost, hideMesh 
}) => {
  const { w, d } = getBrickDimensions(type);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const removeBrick = useLegoStore((state) => state.removeBrick);
  const updateBrick = useLegoStore((state) => state.updateBrick);
  const mode = useLegoStore((state) => state.mode);

  const width = w * MODULE_SIZE;
  const depth = d * MODULE_SIZE;

  const handleSelectStart = (e: any) => {
    if (mode === 'Delete') {
      e.stopPropagation();
      removeBrick(id);
    } else if (mode === 'Move') {
      e.stopPropagation();
      setIsGrabbed(true);
      e.target?.setPointerCapture?.(e.pointerId);
    }
  };

  const handleSelectEnd = (e: any) => {
    if (isGrabbed) {
      e.stopPropagation();
      setIsGrabbed(false);
      e.target?.releasePointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: any) => {};

  const handleRotate = (e: any) => {
    e.stopPropagation();
    if (isGrabbed && !isPlacementGhost) {
      updateBrick(id, { rotation: (rotation + 90) % 360 });
    }
  };

  const ghostRaycast = isPlacementGhost ? () => null : undefined;

  return (
    <group 
      position={position}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
      onPointerDown={isPlacementGhost ? undefined : handleSelectStart} 
      onPointerUp={isPlacementGhost ? undefined : handleSelectEnd}
      onPointerMove={isPlacementGhost ? undefined : handlePointerMove}
      onContextMenu={isPlacementGhost ? undefined : handleRotate}
    >
      <group position={[0, BRICK_HEIGHT / 2, 0]}>
        {hideMesh ? (
          <mesh raycast={ghostRaycast}>
            <boxGeometry args={[width, BRICK_HEIGHT, depth]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ) : (
          <>
            <mesh raycast={ghostRaycast}>
              <boxGeometry args={[width - 0.002, BRICK_HEIGHT, depth - 0.002]} />
              <meshStandardMaterial 
                color={color} 
                roughness={0.1} 
                metalness={0.1}
                transparent={isPlacementGhost}
                opacity={isPlacementGhost ? 0.5 : 1}
                envMapIntensity={1.5}
              />
            </mesh>
            {Array.from({ length: w }).map((_, i) => (
              Array.from({ length: d }).map((_, j) => (
                <mesh 
                  key={`${i}-${j}`} 
                  raycast={ghostRaycast}
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
                    opacity={isPlacementGhost ? 0.5 : 1}
                  />
                </mesh>
              ))
            ))}
          </>
        )}
      </group>
    </group>
  );
};
