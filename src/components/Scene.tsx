import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { XR } from '@react-three/xr';
import * as THREE from 'three';
import { LegoBrick } from './LegoBrick';
import { BrickInstances } from './BrickInstances';
import { useLegoStore, checkPlacementValid, checkStructureValid, getBrickDimensions, PRESETS } from '../Store';

export const Scene = ({ xrStore }: { xrStore?: any }) => {
  const bricks = useLegoStore((state) => state.bricks);
  const mode = useLegoStore((state) => state.mode);
  const selectedType = useLegoStore((state) => state.selectedType);
  const selectedColor = useLegoStore((state) => state.selectedColor);
  const addBrick = useLegoStore((state) => state.addBrick);
  const activePreset = useLegoStore((state) => state.activePreset);
  const commitPreset = useLegoStore((state) => state.commitPreset);
  
  const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [ghostRotation, setGhostRotation] = useState<number>(0);

  useEffect(() => {
    const handleRotate = () => setGhostRotation(r => (r + 90) % 360);
    window.addEventListener('rotate-ghost', handleRotate);
    return () => window.removeEventListener('rotate-ghost', handleRotate);
  }, []);

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
    if (!point) return;
    
    const normal = e.face?.normal || new THREE.Vector3(0, 1, 0);
    const nudge = 0.001;
    const hitX = point.x + normal.x * nudge;
    const hitY = point.y + normal.y * nudge;
    const hitZ = point.z + normal.z * nudge;

    const { w, d } = getBrickDimensions(selectedType);
    const rot = Math.round(ghostRotation / 90) % 4;
    const isRot = rot === 1 || rot === 3 || rot === -1 || rot === -3;
    const effW = isRot ? d : w;
    const effD = isRot ? w : d;

    const alignSnap = (val: number, count: number, step: number) => {
      if (count % 2 === 1) {
        return Math.round(val / step) * step;
      } else {
        return Math.floor(val / step) * step + (step / 2);
      }
    };

    let targetX = alignSnap(hitX, effW, MODULE_SIZE);
    let targetZ = alignSnap(hitZ, effD, MODULE_SIZE);
    let targetY;
    
    if (Math.abs(normal.y) > 0.5) {
      targetY = Math.floor(hitY / BRICK_HEIGHT) * BRICK_HEIGHT;
    } else {
      targetY = Math.floor(Math.max(0, point.y + BRICK_HEIGHT / 2) / BRICK_HEIGHT) * BRICK_HEIGHT;
    }
    
    setGhostPosition([targetX, Math.max(0, targetY), targetZ]);
  };

  const isValidPlacement = useMemo(() => {
    if (mode !== 'Build' || activePreset) return false;
    const ghostBrickData = {
      id: 'ghost',
      type: selectedType,
      position: ghostPosition,
      rotation: ghostRotation
    };
    const status = checkPlacementValid(bricks, ghostBrickData, MODULE_SIZE, BRICK_HEIGHT);
    return status.valid;
  }, [bricks, ghostPosition, ghostRotation, selectedType, mode]);

  const presetBricks = useMemo(() => {
    if (!activePreset || !PRESETS[activePreset]) return [];
    return PRESETS[activePreset].map(b => ({
      ...b,
      position: [
        b.position[0] + ghostPosition[0],
        b.position[1] + ghostPosition[1],
        b.position[2] + ghostPosition[2]
      ] as [number, number, number]
    }));
  }, [activePreset, ghostPosition]);

  const isValidStructurePlacement = useMemo(() => {
    if (mode !== 'Build' || !activePreset) return false;
    return checkStructureValid(bricks, presetBricks, MODULE_SIZE, BRICK_HEIGHT);
  }, [bricks, presetBricks, activePreset, mode]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.button === 2 || e.nativeEvent?.type === 'contextmenu') return;
    
    if (activePreset && isValidStructurePlacement) {
      commitPreset(ghostPosition);
      return;
    }
    if (mode === 'Build' && !activePreset && isValidPlacement) {
      addBrick({
        type: selectedType,
        color: selectedColor,
        position: ghostPosition,
        rotation: ghostRotation
      });
    }
  };

  // Optimization: Group bricks by [type, color] for InstancedMesh rendering
  const groupedBricks = useMemo(() => {
    const groups: Record<string, typeof bricks> = {};
    bricks.forEach(brick => {
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [bricks]);

  const groupedPresetBricks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    presetBricks.forEach(brick => {
      const key = `${brick.type}_${brick.color}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [presetBricks]);

  return (
    <>
      {xrStore ? (
        <XR store={xrStore}>
          <color attach="background" args={['#4da6ff']} />
          <fog attach="fog" args={['#4da6ff', 50, 300]} />
          <ambientLight intensity={0.4} />
          <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#002D04" />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          
          <Suspense fallback={null}>
            <group onPointerMove={handlePointerMove} onPointerDown={handleClick} onContextMenu={(e) => { e.stopPropagation(); }}>
              {/* Visualized Bricks using InstancedMesh */}
              {Object.entries(groupedBricks).map(([key, group]) => {
                const [type, color] = key.split('_');
                return (
                  <BrickInstances 
                    key={key} 
                    type={type as any} 
                    color={color} 
                    bricks={group} 
                  />
                );
              })}

              {mode === 'Build' && !activePreset && isValidPlacement && (
                <LegoBrick 
                  id="ghost" 
                  type={selectedType} 
                  color={selectedColor} 
                  position={ghostPosition} 
                  rotation={ghostRotation} 
                  isPlacementGhost 
                />
              )}

              {activePreset && isValidStructurePlacement && (
                <>
                  {Object.entries(groupedPresetBricks).map(([key, group]) => {
                    const [type, color] = key.split('_');
                    return (
                      <BrickInstances 
                        key={`preset-ghost-${key}`} 
                        type={type as any} 
                        color={color} 
                        bricks={group} 
                        isGhost 
                      />
                    );
                  })}
                </>
              )}

              <mesh 
                receiveShadow 
                rotation={[-Math.PI / 2, 0, 0]} 
                onPointerMove={handlePointerMove}
                onClick={handleClick}
              >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#002D04" />
              </mesh>
            </group>
          </Suspense>
          <OrbitControls makeDefault />
        </XR>
      ) : (
        <>
          <color attach="background" args={['#4da6ff']} />
          <fog attach="fog" args={['#4da6ff', 50, 300]} />
          <ambientLight intensity={0.4} />
          <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#002D04" />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          
          <Suspense fallback={null}>
            <group onPointerMove={handlePointerMove} onPointerDown={handleClick} onContextMenu={(e) => { e.stopPropagation(); }}>
              {/* Visualized Bricks using InstancedMesh */}
              {Object.entries(groupedBricks).map(([key, group]) => {
                const [type, color] = key.split('_');
                return (
                  <BrickInstances 
                    key={key} 
                    type={type as any} 
                    color={color} 
                    bricks={group} 
                  />
                );
              })}

              {mode === 'Build' && !activePreset && isValidPlacement && (
                <LegoBrick 
                  id="ghost" 
                  type={selectedType} 
                  color={selectedColor} 
                  position={ghostPosition} 
                  rotation={ghostRotation} 
                  isPlacementGhost 
                />
              )}

              {activePreset && isValidStructurePlacement && (
                <>
                  {Object.entries(groupedPresetBricks).map(([key, group]) => {
                    const [type, color] = key.split('_');
                    return (
                      <BrickInstances 
                        key={`preset-ghost-${key}`} 
                        type={type as any} 
                        color={color} 
                        bricks={group} 
                        isGhost 
                      />
                    );
                  })}
                </>
              )}

              <mesh 
                receiveShadow 
                rotation={[-Math.PI / 2, 0, 0]} 
                onPointerMove={handlePointerMove}
                onClick={handleClick}
              >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#002D04" />
              </mesh>
            </group>
          </Suspense>
          <OrbitControls makeDefault />
        </>
      )}
    </>
  );
};


