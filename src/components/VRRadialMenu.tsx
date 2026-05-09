import React, { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text, Box } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore } from "../Store";

import { vrTargetManager } from "../lib/vrTargets";

export const VRRadialMenu = ({
  vrScale,
  onToggle,
  currentVRScale,
}: {
  vrScale: "human" | "micro";
  onToggle: () => void;
  currentVRScale: number;
}) => {
  const { gl } = useThree();
  const [visible, setVisible] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const mode = useLegoStore((s) => s.mode);
  const setMode = useLegoStore((s) => s.setMode);

  const wasXPressed = useRef(false);
  const wasYPressed = useRef(false);
  const wasBPressed = useRef(false);

  useFrame((state) => {
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    if (!session) {
      if (visible) setVisible(false);
      return;
    }

    let leftGrip: THREE.Group | null = null;

    for (let i = 0; i < 2; i++) {
      const inputSource = session.inputSources[i];
      if (inputSource && inputSource.handedness === "left") {
        leftGrip = gl.xr.getControllerGrip(i);
        if (inputSource.gamepad) {
          const xPressed =
            !!inputSource.gamepad.buttons[3]?.pressed ||
            !!inputSource.gamepad.buttons[4]?.pressed;
          const yPressed =
            !!inputSource.gamepad.buttons[4]?.pressed ||
            !!inputSource.gamepad.buttons[5]?.pressed;

          if (
            (xPressed && !wasXPressed.current) ||
            (yPressed && !wasYPressed.current)
          ) {
            setVisible(!visible);
          }
          wasXPressed.current = xPressed;
          wasYPressed.current = yPressed;
        }
      } else if (inputSource && inputSource.handedness === "right") {
        if (inputSource.gamepad) {
          const bPressed =
            !!inputSource.gamepad.buttons[4]?.pressed ||
            !!inputSource.gamepad.buttons[5]?.pressed;
          if (bPressed && !wasBPressed.current) {
            if (visible) setVisible(false);
          }
          wasBPressed.current = bPressed;
        }
      }
    }

    if (leftGrip && groupRef.current && visible) {
      // Track the left wrist but do NOT tie visibility to dot product
      const wristPos = new THREE.Vector3().setFromMatrixPosition(
        leftGrip.matrixWorld,
      );
      groupRef.current.position.copy(wristPos);

      // Hover menu slightly above wrist so hands don't clip
      groupRef.current.position.y += vrScale === "human" ? 0.05 : 1.5;
    }

    // Store visibility in global state or window so locomotion can pause
    if (window as any) {
      (window as any).__vrMenuVisible = visible;
    }
  });

  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  React.useEffect(() => {
    const handleHover = (e: any) => setHoveredLabel(e.detail);
    window.addEventListener("vr-menu-hover", handleHover);
    return () => window.removeEventListener("vr-menu-hover", handleHover);
  }, []);

  const radius = vrScale === "human" ? 0.15 : 2.2;
  const boxDepth = vrScale === "human" ? 0.01 : 0.1;
  const fontSize = vrScale === "human" ? 0.03 : 0.5;
  const boxWidth = ((radius * Math.PI) / 3) * 1.5;
  const boxHeight = vrScale === "human" ? 0.06 : 1.0;

  const handleAction = (action: () => void) => {
    action();
    setVisible(false);
  };

  const SEGMENTS = [
    {
      label: "BUILD",
      color: "#00e676",
      action: () => setMode("Build"),
      theta: Math.PI / 2,
    },
    {
      label: "DELETE",
      color: "#ff4757",
      action: () => setMode("Delete"),
      theta: Math.PI, // Left
    },
    {
      label: "MOVE",
      color: "#4da6ff",
      action: () => setMode("Move"),
      theta: 0, // Right
    },
    {
      label: "CLEAR",
      color: "#ff8c42",
      action: () => useLegoStore.getState().clearAll(),
      theta: -Math.PI / 2, // Down
    },
  ];

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {SEGMENTS.map((seg, i) => {
          const x = Math.cos(seg.theta) * radius;
          const y = Math.sin(seg.theta) * radius;
          const isHovered = hoveredLabel === seg.label;
          const depth = isHovered ? boxDepth * 1.5 : boxDepth;
          return (
            <group
              key={i}
              position={[x, y, 0]}
            >
              <Box
                ref={(node) => {
                  if (node) {
                    vrTargetManager.register(node);
                    node.userData.isVRMenuItem = true;
                    node.userData.label = seg.label;
                    node.userData.onTrigger = () => handleAction(seg.action);
                  }
                }}
                name="VRMenuItem"
                args={[boxWidth, boxHeight, depth]}
                material-color={isHovered ? "#ffffff" : seg.color}
              />
              <Text
                position={[0, 0, depth + 0.001]}
                fontSize={fontSize}
                color={isHovered ? seg.color : "white"}
                anchorX="center"
                anchorY="middle"
              >
                {seg.label}
              </Text>
            </group>
          );
        })}
      </Billboard>
    </group>
  );
};
