import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text, Box } from '@react-three/drei';
import * as THREE from 'three';
import { useLegoStore } from '../Store';

export const VRRadialMenu = ({ vrScale, onToggle, currentVRScale }: { vrScale: 'human' | 'micro', onToggle: () => void, currentVRScale: number }) => {
  const { gl, camera } = useThree();
  const [visible, setVisible] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  const mode = useLegoStore(s => s.mode);
  const setMode = useLegoStore(s => s.setMode);
  
  useFrame((state) => {
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    if (!session) {
      if (visible) setVisible(false);
      return;
    }
    
    let leftGrip: THREE.Group | null = null;
    
    for (let i = 0; i < 2; i++) {
        const inputSource = session.inputSources[i];
        if (inputSource && inputSource.handedness === 'left') {
            leftGrip = gl.xr.getControllerGrip(i);
            // Also enable toggle via button press for reliability
            if (inputSource.gamepad) {
                // X or Y button
                if (inputSource.gamepad.buttons[4]?.pressed || inputSource.gamepad.buttons[5]?.pressed) {
                    if (!visible) setVisible(true);
                }
            }
            break;
        }
    }
    
    if (leftGrip && groupRef.current) {
        const wristPos = new THREE.Vector3().setFromMatrixPosition(leftGrip.matrixWorld);
        groupRef.current.position.copy(wristPos);
        
        // Hover menu slightly above wrist so hands don't clip
        groupRef.current.position.y += (vrScale === 'human' ? 0.05 : 1.5);
        
        const headPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
        const headForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const wristToHead = new THREE.Vector3().subVectors(wristPos, headPos).normalize();
        
        const dot = headForward.dot(wristToHead);
        const shouldBeVisible = dot > 0.6;
        if (visible !== shouldBeVisible) {
            setVisible(shouldBeVisible);
        }
    }
  });
  
  const radius = vrScale === 'human' ? 0.06 : 2.2;
  const padding = vrScale === 'human' ? 0.02 : 0.6;
  const boxDepth = vrScale === 'human' ? 0.005 : 0.1;
  const fontSize = vrScale === 'human' ? 0.015 : 0.5;
  const boxWidth = (radius * Math.PI) / 3 * 1.5;
  const boxHeight = vrScale === 'human' ? 0.03 : 1.0;

  const SEGMENTS = [
    { label: 'BUILD', color: '#00e676', action: () => setMode('Build'), theta: Math.PI / 2 },
    { label: 'DELETE', color: '#ff4757', action: () => setMode('Delete'), theta: Math.PI / 6 },
    { label: 'MOVE', color: '#4da6ff', action: () => setMode('Move'), theta: -Math.PI / 6 },
    { label: 'COLOR', color: '#ffd700', action: () => { /* Maybe future expansion */ }, theta: -Math.PI / 2 },
    { label: 'CLEAR', color: '#ff8c42', action: () => useLegoStore.getState().clearAll(), theta: -5 * Math.PI / 6 },
    { label: vrScale === 'human' ? 'GO MICRO 🔬' : 'GO HUMAN 🧍', color: vrScale === 'human' ? '#a78bfa' : '#00e676', action: onToggle, theta: 5 * Math.PI / 6 },
  ];
  
  if (!visible) return null;
  
  return (
    <group ref={groupRef}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {SEGMENTS.map((seg, i) => {
          const x = Math.cos(seg.theta) * radius;
          const y = Math.sin(seg.theta) * radius;
          return (
            <group key={i} position={[x, y, 0]} onClick={(e) => { e.stopPropagation(); seg.action(); }}>
              <Box args={[boxWidth, boxHeight, boxDepth]} material-color={seg.color} />
              <Text position={[0, 0, boxDepth + 0.001]} fontSize={fontSize} color="white" anchorX="center" anchorY="middle">
                {seg.label}
              </Text>
            </group>
          );
        })}
      </Billboard>
    </group>
  );
};
