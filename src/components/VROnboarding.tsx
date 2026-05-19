import React, { useState, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useLegoStore } from "../Store";

export const VROnboarding = () => {
  const instructions = [
    { key: "Right Trigger", action: "Place / Confirm" },
    { key: "Right Grip", action: "Pick Up / Drag" },
    { key: "A (Right)", action: "Rotate Brick" },
    { key: "B (Right)", action: "Cancel / Delete" },
    { key: "Left Stick", action: "Move & Strafe" },
    { key: "Right Stick", action: "Snap Turn" },
    { key: "X / Y (Left)", action: "Build Menu / Palette" },
    { key: "Stick Click / L-Grip", action: "Recenter" },
  ];

  const subtext = "Use Left Stick to move and Right Stick to turn your orientation.";

  const closeXRPanel = useLegoStore((state) => state.closeXRPanel);

  useEffect(() => {
    const t = setTimeout(() => {
      closeXRPanel();
    }, 10000);
    return () => clearTimeout(t);
  }, [closeXRPanel]);

  return (
    <group scale={0.7}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.4, 2.2]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.9, 0]}
        color="#a855f7"
        fontSize={0.18}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        HOW TO BUILD
      </Text>
      
      <Text
        position={[0, -0.7, 0]}
        color="#fbbf24"
        fontSize={0.08}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="center"
      >
        {subtext}
      </Text>
      
      <Text
        position={[0, -0.9, 0]}
        color="#aaaaaa"
        fontSize={0.06}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="center"
      >
        Press B to close or wait.
      </Text>
      
      <group position={[-0.9, 0.55, 0]}>
        {instructions.map((item, i) => {
          const y = -i * 0.16;
          return (
            <group key={item.key} position={[0, y, 0]}>
              <Text
                position={[0, 0, 0]}
                color="#aaaaaa"
                fontSize={0.09}
                anchorX="left"
                anchorY="middle"
              >
                {item.key}:
              </Text>
              <Text
                position={[0.7, 0, 0]}
                color="white"
                fontSize={0.09}
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
