import React from "react";
import { Text } from "@react-three/drei";

export const VROnboarding = () => {
  const instructions = [
    { key: "X", action: "Build Menu" },
    { key: "B", action: "Close/Cancel" },
    { key: "Y", action: "Palette, only if menu is closed" },
    { key: "Right Trigger", action: "Place/Select" },
    { key: "Right Grip", action: "Pick/Move" },
    { key: "A", action: "Rotate" },
    { key: "Right Stick", action: "Snap Turn" },
  ];

  return (
    <group position={[0, 1.4, -2]}>
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
