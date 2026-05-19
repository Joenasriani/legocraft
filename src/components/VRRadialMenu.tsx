import React, { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useLegoStore } from "../Store";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { useXRStore } from "@react-three/xr";

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
  const groupRef = useRef<THREE.Group>(null);
  const xrStore = useXRStore();
  const setMode = useLegoStore((s) => s.setMode);
  const visible = useLegoStore((s) => s.xrPanel === "buildMenu");

  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const [clearArmed, setClearArmed] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setClearArmed(false);
    }
  }, [visible]);

  useFrame((state, delta) => {
    if (!visible || !gl.xr.isPresenting || !groupRef.current) return;

    const xrState = xrStore.getState() as any;
    const inputSources = Array.from(xrState.inputSourceStates || []) as any[];
    const leftState = inputSources.find((s) => s.inputSource.handedness === "left" && !s.inputSource.hand);
    const leftController = leftState?.object;

    if (leftController) {
      // Anchor near left controller (hand center)
      const worldPos = new THREE.Vector3().setFromMatrixPosition(leftController.matrixWorld);
      const worldQuat = new THREE.Quaternion().setFromRotationMatrix(leftController.matrixWorld);
      
      const cam = gl.xr.getCamera();
      const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      
      // Near hand, slightly up
      const targetPos = worldPos.clone().add(new THREE.Vector3(0, 0.15, 0).applyQuaternion(worldQuat));
      
      const lookAtQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(targetPos, camPos, new THREE.Vector3(0, 1, 0));
      lookAtQuat.setFromRotationMatrix(m);
      
      groupRef.current.position.lerp(targetPos, delta * 12);
      groupRef.current.quaternion.slerp(lookAtQuat, delta * 12);
    } else {
      const cam = gl.xr.getCamera();
      const target = getSafePanelTransform(cam);
      const currentPos = groupRef.current.position;
      
      const distance = currentPos.distanceTo(target.position);
      if (distance > 2.0) {
        currentPos.copy(target.position);
        groupRef.current.quaternion.copy(target.quaternion);
      } else if (distance > 0.1) {
        currentPos.lerp(target.position, delta * 4.0);
        groupRef.current.quaternion.slerp(target.quaternion, delta * 4.0);
      }
    }
  });

  const radius = vrScale === "human" ? 0.22 : 2.2;
  const boxDepth = vrScale === "human" ? 0.015 : 0.1;
  const fontSize = vrScale === "human" ? 0.035 : 0.5;
  const boxWidth = ((radius * Math.PI) / 3) * 1.5;
  const boxHeight = vrScale === "human" ? 0.08 : 1.0;

  const showXRPerf = useLegoStore((s) => s.showXRPerf);
  const setShowXRPerf = useLegoStore((s) => s.setShowXRPerf);

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
      theta: Math.PI / 2, // Top
    },
    {
      label: "MOVE",
      color: "#4da6ff",
      action: () => setMode("Move"),
      theta: Math.PI / 6, // Top Right
    },
    {
      label: "RESET POS",
      color: "#9b59b6",
      action: () => useLegoStore.getState().triggerVRRecenter(),
      theta: -Math.PI / 6, // Bottom Right
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
      theta: -Math.PI / 2, // Down
    },
    {
      label: showXRPerf ? "HIDE STATS" : "SHOW STATS",
      color: "#ffb8b8",
      action: () => setShowXRPerf(!showXRPerf),
      theta: (-Math.PI * 5) / 6, // Bottom Left
    },
    {
      label: "DELETE",
      color: "#ff4757",
      action: () => setMode("Delete"),
      theta: (Math.PI * 5) / 6, // Top Left
    },
  ];

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, 100, 0]}>
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
