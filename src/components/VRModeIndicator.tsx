import React, { useMemo } from "react";
import { Text } from "@react-three/drei";
import { useLegoStore } from "../Store";

export const VRModeIndicator = () => {
  const mode = useLegoStore((s) => s.mode);
  const toast = useLegoStore((s) => s.toastMessage);
  
  const modeColor = useMemo(() => {
    switch(mode) {
      case "Build": return "#00e676";
      case "Move": return "#4da6ff";
      case "Delete": return "#ff4757";
      default: return "#ffffff";
    }
  }, [mode]);

  return (
    <group position={[0, -0.6, 0]}>
      {/* Toast message if any */}
      {toast && (
        <group position={[0, 0.15, 0.01]}>
           <mesh>
             <planeGeometry args={[1.2, 0.15]} />
             <meshBasicMaterial color="#1a1a1a" transparent opacity={0.8} />
           </mesh>
           <Text
            position={[0, 0, 0.005]}
            fontSize={0.05}
            color="#ffffff"
            maxWidth={1.1}
            textAlign="center"
          >
            {toast}
          </Text>
        </group>
      )}

      {/* Mode display */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.5, 0.12]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.9} />
      </mesh>
      <Text
        position={[0, 0, 0.005]}
        fontSize={0.06}
        color={modeColor}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {mode.toUpperCase()}
      </Text>
    </group>
  );
};
