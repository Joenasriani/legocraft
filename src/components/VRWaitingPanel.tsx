import React, { useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";

export const VRWaitingPanel = () => {
  const { camera } = useThree();
  const [transform, setTransform] = useState({ 
    position: new THREE.Vector3(0, 1.5, -2), 
    quaternion: new THREE.Quaternion() 
  });

  useEffect(() => {
    // Only calculate once when it appears
    setTransform(getSafePanelTransform(camera));
  }, [camera]);

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
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
