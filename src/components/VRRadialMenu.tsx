import React, { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useLegoStore } from "../Store";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useXRStore } from "@react-three/xr";
import { usePresence } from "motion/react";
import { animate } from "motion";

const VRMenuItem = ({
  seg,
  depth,
  fontSize,
  isHovered,
  boxWidth,
  boxHeight,
  handleAction,
}: any) => {
  const meshRef = useRef<THREE.Mesh>(null);

  React.useEffect(() => {
    if (meshRef.current) {
      vrTargetManager.register(meshRef.current, "menu");
      meshRef.current.userData.isVRMenuItem = true;
      meshRef.current.userData.label = seg.label;
      meshRef.current.userData.onTrigger = () => handleAction(seg.action);
    }
    return () => {
      if (meshRef.current) {
        vrTargetManager.unregister(meshRef.current);
      }
    };
  }, [seg, handleAction]);

  return (
    <group>
      <mesh ref={meshRef} name="VRMenuItem">
        <boxGeometry args={[boxWidth, boxHeight, depth]} />
        <meshStandardMaterial color={isHovered ? "#ffffff" : seg.color} />
      </mesh>
      <Text
        position={[0, 0, depth / 2 + 0.005]}
        fontSize={fontSize || 0.04}
        color={isHovered ? seg.color : "white"}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZJhiI2B.woff"
      >
        {seg.label}
      </Text>
    </group>
  );
};

export const VRRadialMenu = ({
  vrScale,
}: {
  vrScale: "human" | "micro";
}) => {
  const { gl } = useThree();
  const setMode = useLegoStore((s) => s.setMode);
  const visible = useLegoStore((s) => s.xrPanel === "buildMenu");

  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const [clearArmed, setClearArmed] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setClearArmed(false);
    }
  }, [visible]);

  const radius = vrScale === "human" ? 0.22 : 2.2;
  const boxDepth = vrScale === "human" ? 0.015 : 0.1;
  const fontSize = vrScale === "human" ? 0.035 : 0.4;
  const boxWidth = ((radius * Math.PI) / 4) * 1.4;
  const boxHeight = vrScale === "human" ? 0.08 : 0.9;

  const showXRPerf = useLegoStore((s) => s.showXRPerf);
  const setShowXRPerf = useLegoStore((s) => s.setShowXRPerf);

  const groupRef = useRef<THREE.Group>(null);
  const [isPresent, safeToRemove] = usePresence();

  React.useEffect(() => {
    if (!groupRef.current) return;
    
    if (isPresent) {
      groupRef.current.scale.set(0.1, 0.1, 0.1);
      groupRef.current.position.z = 0.1;
      
      const controls = animate(0, 1, {
        type: "spring",
        stiffness: 350,
        damping: 25,
        onUpdate(v) {
          if (groupRef.current) {
            const s = 0.1 + v * 0.9;
            groupRef.current.scale.set(s, s, s);
            groupRef.current.position.z = 0.1 - (v * 0.1);
          }
        }
      });
      return () => controls.stop();
    } else {
      const controls = animate(1, 0, {
        type: "spring",
        stiffness: 350,
        damping: 25,
        onUpdate(v) {
          if (groupRef.current) {
            const s = 0.1 + v * 0.9;
            groupRef.current.scale.set(s, s, s);
            groupRef.current.position.z = 0.1 - (v * 0.1);
          }
        },
        onComplete: () => safeToRemove()
      });
      return () => controls.stop();
    }
  }, [isPresent, safeToRemove]);

  const handleAction = (action: () => void) => {
    // Try to trigger haptic feedback on right controller if selecting
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    if (session) {
      for (const source of session.inputSources) {
        if (source.handedness === "right") {
          triggerHaptics(source, HapticType.UI_CLICK);
        }
      }
    }
    action();
    useLegoStore.getState().closeXRPanel();
  };

  const SEGMENTS = [
    {
      label: "BUILD",
      color: "#00e676",
      action: () => setMode("Build"),
      theta: Math.PI / 4,
    },
    {
      label: "MOVE",
      color: "#4da6ff",
      action: () => setMode("Move"),
      theta: 0,
    },
    {
      label: "UNDO",
      color: "#feca57",
      action: () => useLegoStore.getState().undo(),
      theta: Math.PI / 2,
    },
    {
      label: "REDO",
      color: "#ff9ff3",
      action: () => useLegoStore.getState().redo(),
      theta: (Math.PI * 3) / 4,
    },
    {
      label: "DELETE",
      color: "#ff4757",
      action: () => setMode("Delete"),
      theta: Math.PI,
    },
    {
      label: "RESET POS",
      color: "#9b59b6",
      action: () => useLegoStore.getState().triggerVRRecenter(),
      theta: (-Math.PI * 3) / 4,
    },
    {
      label: clearArmed ? "CONFIRM" : "CLEAR",
      color: clearArmed ? "#ff0000" : "#ff8c42",
      action: () => {
        if (!clearArmed) {
          setClearArmed(true);
        } else {
          useLegoStore.getState().clearAll();
          setClearArmed(false);
        }
      },
      theta: -Math.PI / 2,
    },
    {
      label: showXRPerf ? "HIDE STATS" : "SHOW STATS",
      color: "#ffb8b8",
      action: () => setShowXRPerf(!showXRPerf),
      theta: -Math.PI / 4,
    },
  ];

  return (
    <group ref={groupRef}>
      {SEGMENTS.map((seg, i) => {
        const x = Math.cos(seg.theta) * radius;
        const y = Math.sin(seg.theta) * radius;
        const isHovered = hoveredLabel === seg.label;
        const depth = isHovered ? boxDepth * 1.5 : boxDepth;
        return (
          <group key={i} position={[x, y, 0]}>
            <VRMenuItem
              seg={seg}
              depth={depth}
              fontSize={fontSize}
              isHovered={isHovered}
              boxWidth={boxWidth}
              boxHeight={boxHeight}
              handleAction={handleAction}
            />
          </group>
        );
      })}
    </group>
  );
};
