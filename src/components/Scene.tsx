import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Sky, Clouds, Cloud } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { LegoBrick } from './LegoBrick';
import { useLegoStore, checkPlacementValid, getBrickDimensions } from '../Store';

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
    
    // Process hit location
    const point = e.point;
    if (!point) return;

    const normal = e.face?.normal || new THREE.Vector3(0, 1, 0);
    const { widthX, depthZ } = getBrickWorldDimensions(selectedType, ghostRotation);
    
    // Nudge point out slightly to resolve cell boundary safely
    const nudge = 0.001;
    const hitX = point.x + normal.x * nudge;
    const hitY = point.y + normal.y * nudge;
    const hitZ = point.z + normal.z * nudge;
    
    let targetX, targetY, targetZ;
    
    if (Math.abs(normal.y) > 0.5) {
        // Hit top/bottom: align directly to grid
        targetX = snapToGrid(hitX, HALF_MODULE);
        targetZ = snapToGrid(hitZ, HALF_MODULE);
        targetY = snapToGrid(hitY, BRICK_HEIGHT);
    } else {
        // Hit side: push center point outwards by half the brick size
        targetX = snapToGrid(hitX + normal.x * (widthX / 2), HALF_MODULE);
        targetZ = snapToGrid(hitZ + normal.z * (depthZ / 2), HALF_MODULE);
        targetY = snapToGrid(hitY, BRICK_HEIGHT);
    }

    setGhostPosition([
      targetX,
      Math.max(0, targetY),
      targetZ
    ]);
  };

  // Real-time overlap & support check for the ghost brick
  const isValidPlacement = useMemo(() => {
    if (mode !== 'Build') return false;
    const ghostBrickData = {
      id: 'ghost',
      type: selectedType,
      position: ghostPosition,
      rotation: ghostRotation
    };
    
    const status = checkPlacementValid(bricks, ghostBrickData, MODULE_SIZE, BRICK_HEIGHT);
    return status.valid;
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
        {/* Cinematic Outdoor Lighting */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#002D04" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
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
                  color={isValidPlacement ? '#22c55e' : '#ef4444'} 
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
                  sectionThickness={1.5} 
                  cellSize={MODULE_SIZE} 
                  cellThickness={1} 
                  cellColor="#1b4d22" 
                  sectionColor="#266c30"
                  position={[0, 0.001, 0]}
                />
                <mesh 
                  receiveShadow 
                  rotation={[-Math.PI / 2, 0, 0]} 
                  position={[0, 0, 0]}
                >
                  <planeGeometry args={[50, 50]} />
                  <meshStandardMaterial color="#002D04" roughness={1} metalness={0} />
                </mesh>
              </RigidBody>
            </group>
          </Physics>
          
          <ContactShadows opacity={0.6} scale={10} blur={2} far={4} resolution={256} color="#000000" />
          <Sky sunPosition={[100, 20, 100]} turbidity={0.1} />
          <Clouds>
            <Cloud segments={20} bounds={[10, 2, 10]} volume={5} color="#ffffff" position={[0, 15, 0]} opacity={0.6} />
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
