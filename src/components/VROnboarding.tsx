import React, { useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useLegoStore } from "../Store";

export const VROnboarding = () => {
  const { camera, gl } = useThree();
  const [transform, setTransform] = useState({ 
    position: new THREE.Vector3(0, 1.4, -2), 
    quaternion: new THREE.Quaternion() 
  });

  useEffect(() => {
    const cam = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    setTransform(getSafePanelTransform(cam));
  }, [camera, gl.xr.isPresenting]);

  const instructions = [
    { key: "Right Trigger", action: "Place/Select" },
    { key: "Right Grip", action: "Pick/Move" },
    { key: "A", action: "Rotate" },
    { key: "X", action: "Build Menu" },
    { key: "Y", action: "Palette (if menu closed)" },
    { key: "B", action: "Close Menu / Cancel" },
  ];

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.2, 1.5]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.55, 0]}
        color="#a855f7"
        fontSize={0.16}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        HOW TO BUILD
      </Text>
      
      <group position={[-0.8, 0.25, 0]}>
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
