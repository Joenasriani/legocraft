import React, { useEffect } from "react";
import { Text } from "@react-three/drei";
import { useLegoStore } from "../Store";

export const VROnboarding = () => {
  const instructions = [
    { key: "Right Trigger", action: "Place" },
    { key: "Right Grip", action: "Delete" },
    { key: "A (Right)", action: "Rotate" },
    { key: "B (Right)", action: "Cancel" },
    { key: "Left Stick", action: "Move" },
    { key: "X / Y (Left)", action: "Menu" },
  ];

  const closeXRPanel = useLegoStore((state) => state.closeXRPanel);

  useEffect(() => {
    const t = setTimeout(() => {
      closeXRPanel();
    }, 10000);
    return () => clearTimeout(t);
  }, [closeXRPanel]);

  // VRHeadAnchor places the group at ~1.35m in front of the headset, and slightly below (-0.2m).
  // We offset it further back (-0.25m on Z) to be ~1.6m away, and slightly lower it to be ~0.35m below eye level.
  return (
    <group position={[0, -0.15, -0.25]} scale={1.0}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.75, 0.55]} />
        <meshBasicMaterial color="#18181b" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      
      <Text
        position={[0, 0.2, 0]}
        color="#a855f7"
        fontSize={0.045}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        HOW TO BUILD
      </Text>
      
      <group position={[-0.3, 0.1, 0]}>
        {instructions.map((item, i) => {
          const y = -i * 0.055;
          return (
            <group key={item.key} position={[0, y, 0]}>
              <Text
                position={[0, 0, 0]}
                color="#a1a1aa"
                fontSize={0.035}
                anchorX="left"
                anchorY="middle"
              >
                {item.key}:
              </Text>
              <Text
                position={[0.28, 0, 0]}
                color="#ffffff"
                fontSize={0.035}
                anchorX="left"
                anchorY="middle"
              >
                {item.action}
              </Text>
            </group>
          );
        })}
      </group>

      <Text
        position={[0, -0.22, 0]}
        color="#71717a"
        fontSize={0.025}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.7}
        textAlign="center"
      >
        Press B to close or wait.
      </Text>
    </group>
  );
};
