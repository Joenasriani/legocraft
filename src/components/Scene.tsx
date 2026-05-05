import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Sky, Clouds, Cloud } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { LegoBrick } from './LegoBrick';
import { useLegoStore, getOccupiedCells, getBrickDimensions } from '../Store';

// Access the singleton store created in App.tsx (or export it if needed, 
// for simplicity we will just rely on the XR component not needing a specific store
// if we import it from a shared place. Let's just create a shared store module).
// Wait, we need it to be the same instance. I will pass it from App, or export it.

export const Scene = ({ xrStore }: { xrStore?: any }) => {
  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);
  const selectedType = useLegoStore((state) => state.selectedType);
  const selectedColor = useLegoStore((state) => state.selectedColor);
  const addBrick = useLegoStore((state) => state.addBrick);
  
  const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [ghostRotation, setGhostRotation] = useState<number>(0);

  useEffect(() => {
    const handleRotate = () => setGhostRotation(r => (r + 90) % 360);
    window.addEventListener('rotate-ghost', handleRotate);
    return () => window.removeEventListener('rotate-ghost', handleRotate);
  }, []);

  // Grid constants
  const MODULE_SIZE = 0.08;
  const HALF_MODULE = MODULE_SIZE / 2;
  const BRICK_HEIGHT = 0.096;

  const snapToGrid = (val: number, step: number) => Math.round(val / step) * step;

  const getBrickWorldDimensions = (type: string, rotation: number) => {
    const { w, d } = getBrickDimensions(type as any);
    const rot = Math.round(rotation / 90) % 4;
    const isRot = rot === 1 || rot === 3 || rot === -1 || rot === -3;
    const effW = isRot ? d : w;
    const effD = isRot ? w : d;
    return {
      widthX: effW * MODULE_SIZE,
      depthZ: effD * MODULE_SIZE
    };
  };

  const handlePointerMove = (e: any) => {
    if (mode !== 'Build') return;
    e.stopPropagation();
    
    const point = e.point;
    const normal = e.face?.normal || new THREE.Vector3(0, 1, 0);

    if (point) {
      const { widthX, depthZ } = getBrickWorldDimensions(selectedType, ghostRotation);
      
      let targetX = point.x + normal.x * (widthX / 2);
      let targetY = point.y;
      
      if (Math.abs(normal.y) > 0.5) {
          targetY = normal.y > 0 ? point.y : point.y - BRICK_HEIGHT;
      } else {
          // Snap downward more aggressively if clicking on a side wall so it aligns
          targetY = Math.floor(point.y / BRICK_HEIGHT) * BRICK_HEIGHT; 
      }
      let targetZ = point.z + normal.z * (depthZ / 2);

      setGhostPosition([
        snapToGrid(targetX, HALF_MODULE),
        Math.max(0, snapToGrid(targetY, BRICK_HEIGHT)),
        snapToGrid(targetZ, HALF_MODULE)
      ]);
    }
  };

  // Real-time overlap check for the ghost brick
  const isValidPlacement = useMemo(() => {
    if (mode !== 'Build') return false;
    const EPSILON = 0.01;
    const ghostBrickData = {
      id: 'ghost',
      type: selectedType,
      color: selectedColor,
      position: ghostPosition,
      rotation: ghostRotation
    };
    const ghostCells = getOccupiedCells(ghostBrickData, MODULE_SIZE);

    const isOverlap = bricks.some(b => {
      if (Math.abs(b.position[1] - ghostPosition[1]) > EPSILON) return false;
      const bCells = getOccupiedCells(b, MODULE_SIZE);
      return ghostCells.some(gc => 
        bCells.some(bc => 
          Math.abs(gc.x - bc.x) < EPSILON && 
          Math.abs(gc.z - bc.z) < EPSILON
        )
      );
    });

    if (isOverlap) return false;

    // Ground check: y=0 is always supported
    if (ghostPosition[1] < EPSILON) return true;

    // Support check: must have at least one occupied cell directly underneath
    const isSupported = bricks.some(b => {
      if (Math.abs(b.position[1] - (ghostPosition[1] - BRICK_HEIGHT)) > EPSILON) return false;
      const bCells = getOccupiedCells(b, MODULE_SIZE);
      return ghostCells.some(gc => 
        bCells.some(bc => 
          Math.abs(gc.x - bc.x) < EPSILON && 
          Math.abs(gc.z - bc.z) < EPSILON
        )
      );
    });

    return isSupported;
  }, [bricks, ghostPosition, ghostRotation, selectedType, mode]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'Build' && isValidPlacement) {
      addBrick({
        type: selectedType,
        color: selectedColor,
        position: ghostPosition,
        rotation: ghostRotation
      });
    }
  };

  return (
    <>
      <XR store={xrStore}>
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
            {/* Wrap all interactive elements in a single group to catch pointer events easily */}
            <group onPointerMove={handlePointerMove} onPointerDown={handleClick}>
              {/* Bricks */}
              {bricks.map((brick) => (
                <LegoBrick key={brick.id} {...brick} />
              ))}

              {/* Ghost for placement */}
              {mode === 'Build' && (
                <LegoBrick 
                  id="ghost" 
                  type={selectedType} 
                  color={isValidPlacement ? selectedColor : '#ff0000'} 
                  position={ghostPosition} 
                  rotation={ghostRotation} 
                  isPlacementGhost 
                />
              )}

              {/* Interactive Grid Floor */}
              <RigidBody type="fixed" colliders="cuboid">
                <Grid 
                  infiniteGrid 
                  fadeDistance={10} 
                  sectionSize={MODULE_SIZE} 
                  sectionThickness={1.2} 
                  cellSize={MODULE_SIZE} 
                  cellThickness={1} 
                  cellColor="#4a4" 
                  sectionColor="#4a4"
                  position={[0, 0.001, 0]}
                />
                <mesh 
                  receiveShadow 
                  rotation={[-Math.PI / 2, 0, 0]} 
                  position={[0, 0, 0]}
                >
                  <planeGeometry args={[50, 50]} />
                  <meshStandardMaterial color="#3a7d2b" roughness={1} />
                </mesh>
              </RigidBody>
            </group>
          </Physics>
          
          <ContactShadows opacity={0.6} scale={10} blur={2} far={4} resolution={256} color="#000000" />
          <Sky sunPosition={[100, 20, 100]} />
          <Clouds>
            <Cloud segments={20} bounds={[10, 2, 10]} volume={10} color="#ffffff" position={[0, 15, 0]} />
          </Clouds>
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
