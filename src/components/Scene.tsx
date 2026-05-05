import React, { Suspense, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { LegoBrick } from './LegoBrick';
import { useLegoStore } from '../Store';

// Create a singleton store for the scene if not passed from above
const defaultStore = createXRStore({
  hand: true,
  controller: true,
});

export const Scene = () => {
  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);
  const selectedType = useLegoStore((state) => state.selectedType);
  const selectedColor = useLegoStore((state) => state.selectedColor);
  const addBrick = useLegoStore((state) => state.addBrick);
  
  const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Grid constants
  const MODULE_SIZE = 0.08;
  const HALF_MODULE = MODULE_SIZE / 2;
  const BRICK_HEIGHT = 0.096;

  const snapToGrid = (val: number, step: number) => Math.round(val / step) * step;

  // Handle building placement
  const handlePointerMove = (e: any) => {
    if (mode !== 'Build') return;
    const point = e.point;
    if (point) {
      // Offset Y slightly to snap to the top of surfaces
      const yOffset = point.y > 0.01 ? 0 : 0;
      setGhostPosition([
        snapToGrid(point.x, HALF_MODULE),
        Math.max(0, snapToGrid(point.y + yOffset, BRICK_HEIGHT)),
        snapToGrid(point.z, HALF_MODULE)
      ]);
    }
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'Build') {
      addBrick({
        type: selectedType,
        color: selectedColor,
        position: ghostPosition,
        rotation: 0
      });
    }
  };

  return (
    <>
      <XR store={defaultStore}>
        {/* Lights */}
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            {/* Bricks */}
            {bricks.map((brick) => (
              <LegoBrick key={brick.id} {...brick} />
            ))}

            {/* Ghost for placement */}
            {mode === 'Build' && (
              <LegoBrick 
                id="ghost" 
                type={selectedType} 
                color={selectedColor} 
                position={ghostPosition} 
                rotation={0} 
                isPlacementGhost 
              />
            )}

            {/* Interactive Grid Floor */}
            <RigidBody type="fixed" colliders="cuboid">
              <Grid 
                infiniteGrid 
                fadeDistance={20} 
                sectionSize={MODULE_SIZE * 10} 
                sectionThickness={1} 
                cellSize={MODULE_SIZE} 
                cellThickness={0.5} 
                cellColor="#444" 
                sectionColor="#666"
              />
              <mesh 
                receiveShadow 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, -0.001, 0]}
                onPointerMove={handlePointerMove} 
                onPointerDown={handleClick}
              >
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial transparent opacity={0.05} color="white" />
              </mesh>
            </RigidBody>
          </Physics>
          
          <ContactShadows opacity={0.6} scale={10} blur={2} far={4} resolution={256} color="#000000" />
          <Environment preset="apartment" />
        </Suspense>

        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2}
          dampingFactor={0.05}
          minDistance={0.2}
          maxDistance={5}
        />
      </XR>
    </>
  );
};
