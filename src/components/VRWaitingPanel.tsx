import React, { useState, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useLegoStore } from "../Store";

export const VRWaitingPanel = () => {
  const closeXRPanel = useLegoStore((state: any) => state.closeXRPanel);

  useEffect(() => {
    const t = setTimeout(() => {
      // If we are still waiting after 15 seconds, just close it so it's not a persistent annoyance
      if (useLegoStore.getState().xrPanel === "waitingControllers") {
         closeXRPanel();
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [closeXRPanel]);

  return (
    <group>
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
