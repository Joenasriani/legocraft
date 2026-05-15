import React, { useState, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";

export const VRWaitingPanel = () => {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [transform, setTransform] = useState({ 
    position: new THREE.Vector3(0, 100, 0), 
    quaternion: new THREE.Quaternion() 
  });

  useFrame((state, delta) => {
    if (!gl.xr.isPresenting || !groupRef.current) return;
    const cam = gl.xr.getCamera();
    const target = getSafePanelTransform(cam);
    
    // Jump if extremely far away
    if (groupRef.current.position.distanceTo(target.position) > 10) {
      groupRef.current.position.copy(target.position);
      groupRef.current.quaternion.copy(target.quaternion);
    } else {
      // Smoothly follow
      groupRef.current.position.lerp(target.position, delta * 3.0);
      groupRef.current.quaternion.slerp(target.quaternion, delta * 3.0);
    }
  });

  return (
    <group ref={groupRef} position={transform.position} quaternion={transform.quaternion}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[2.5, 0.8]} />
        <meshBasicMaterial color="#111111" opacity={0.8} transparent depthWrite={false} />
      </mesh>
      <Text
        color="white"
        fontSize={0.15}
        maxWidth={2.2}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {"Waiting for Quest controllers...\nPress any button on your controllers.\nIf this continues, exit VR and re-enter."}
      </Text>
    </group>
  );
};
