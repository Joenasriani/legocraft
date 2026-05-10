import React, { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text, Box } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore } from "../Store";

import { vrTargetManager } from "../lib/vrTargets";

const VRMenuItem = ({ seg, depth, fontSize, isHovered, boxWidth, boxHeight, handleAction }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);

  React.useEffect(() => {
    if (meshRef.current) {
      vrTargetManager.register(meshRef.current);
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
    <>
      <Box
        ref={meshRef}
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
    </>
  );
};

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
  const leftGripIndex = useRef<number | null>(null);

  React.useEffect(() => {
    const handleConn = (i: number) => (e: any) => {
      if (e.data?.handedness === 'left') leftGripIndex.current = i;
    };
    const c0 = gl.xr.getControllerGrip(0);
    const cb0 = handleConn(0);
    c0.addEventListener('connected', cb0);
    
    const c1 = gl.xr.getControllerGrip(1);
    const cb1 = handleConn(1);
    c1.addEventListener('connected', cb1);
    
    return () => {
      c0.removeEventListener('connected', cb0);
      c1.removeEventListener('connected', cb1);
    }
  }, [gl.xr]);

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
    if (leftGripIndex.current !== null) {
      leftGrip = gl.xr.getControllerGrip(leftGripIndex.current);
    }

    for (const inputSource of session.inputSources) {
      if (!inputSource) continue;
      if (inputSource.handedness === "left" && inputSource.gamepad) {
        const xPressed = !!inputSource.gamepad.buttons[4]?.pressed;
        if (xPressed && !wasXPressed.current) {
          setVisible(!visible);
        }
        wasXPressed.current = xPressed;
      } else if (inputSource.handedness === "right" && inputSource.gamepad) {
        const bPressed = !!inputSource.gamepad.buttons[5]?.pressed;
        if (bPressed && !wasBPressed.current) {
          if (visible) setVisible(false);
        }
        wasBPressed.current = bPressed;
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
  });

  React.useEffect(() => {
    useLegoStore.getState().setVrMenuVisible(visible);
  }, [visible]);

  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [clearArmed, setClearArmed] = useState(false);

  React.useEffect(() => {
    const handleHover = (e: any) => setHoveredLabel(e.detail);
    window.addEventListener("vr-menu-hover", handleHover);
    return () => window.removeEventListener("vr-menu-hover", handleHover);
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setClearArmed(false);
    }
  }, [visible]);

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
      label: clearArmed ? "CONFIRM" : "CLEAR",
      color: clearArmed ? "#ff0000" : "#ff8c42",
      action: () => {
        if (!clearArmed) {
          setClearArmed(true);
        } else {
          useLegoStore.getState().clearAll();
          setClearArmed(false);
          onToggle(); // Close menu
        }
      },
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
      </Billboard>
    </group>
  );
};
