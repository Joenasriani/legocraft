import React, { useState, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useLegoStore } from "../Store";

export const VROnboarding = () => {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  // Set initial position out of view
  const [transform, setTransform] = useState({ 
    position: new THREE.Vector3(0, 100, 0), 
    quaternion: new THREE.Quaternion() 
  });

  useFrame((state, delta) => {
    if (!gl.xr.isPresenting || !groupRef.current) return;
    const cam = gl.xr.getCamera();
    const target = getSafePanelTransform(cam);
    
    // Jump if extremely far away (e.g. first frame)
    if (groupRef.current.position.distanceTo(target.position) > 10) {
      groupRef.current.position.copy(target.position);
      groupRef.current.quaternion.copy(target.quaternion);
    } else {
      // Smoothly follow
      groupRef.current.position.lerp(target.position, delta * 3.0);
      groupRef.current.quaternion.slerp(target.quaternion, delta * 3.0);
    }
  });

  const instructions = [
    { key: "Left Stick", action: "Smooth Move" },
    { key: "Right Stick", action: "Snap Turn" },
    { key: "Right Trigger", action: "Place/Confirm" },
    { key: "Right Grip", action: "Select/Move" },
    { key: "A", action: "Rotate" },
    { key: "B", action: "Cancel/Close" },
  ];

  const closeXRPanel = useLegoStore((state) => state.closeXRPanel);

  useEffect(() => {
    const t = setTimeout(() => {
      closeXRPanel();
    }, 8000);
    return () => clearTimeout(t);
  }, [closeXRPanel]);

  return (
    <group ref={groupRef} position={transform.position} quaternion={transform.quaternion}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.2, 1.8]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.7, 0]}
        color="#a855f7"
        fontSize={0.16}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        HOW TO BUILD
      </Text>
      
      <Text
        position={[0, -0.7, 0]}
        color="#fbbf24"
        fontSize={0.07}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="center"
      >
        Press B to close or wait.
      </Text>
      
      <group position={[-0.8, 0.35, 0]}>
        {instructions.map((item, i) => {
          const y = -i * 0.12;
          return (
            <group key={item.key} position={[0, y, 0]}>
              <Text
                position={[0, 0, 0]}
                color="#aaaaaa"
                fontSize={0.08}
                anchorX="left"
                anchorY="middle"
              >
                {item.key}:
              </Text>
              <Text
                position={[0.6, 0, 0]}
                color="white"
                fontSize={0.08}
                anchorX="left"
                anchorY="middle"
              >
                {item.action}
              </Text>
            </group>
          );
        })}
      </group>
    </group>
  );
};
