import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useXRStore } from "@react-three/xr";
import { getSafePanelTransform } from "./lib/vrHelpers";
import { useLegoStore } from "./Store";

export const VRHeadAnchor = ({ children }: { children: React.ReactNode }) => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!gl.xr.isPresenting || !groupRef.current) return;
    const cam = gl.xr.getCamera();
    const target = getSafePanelTransform(cam);
    
    if (groupRef.current.position.distanceTo(target.position) > 10) {
      groupRef.current.position.copy(target.position);
      groupRef.current.quaternion.copy(target.quaternion);
    } else {
      groupRef.current.position.lerp(target.position, delta * 5.0);
      groupRef.current.quaternion.slerp(target.quaternion, delta * 5.0);
    }
  });

  return <group ref={groupRef} position={[0, 100, 0]}>{children}</group>;
};

export const VRLeftHandAnchor = ({ children }: { children: React.ReactNode }) => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const xrPanel = useLegoStore((state) => state.xrPanel);
  const wasMenuOpen = useRef(false);

  useFrame(() => {
    if (!gl.xr.isPresenting || !groupRef.current) return;

    // We only want to place the menu if a panel is actually active.
    const isMenuOpen = xrPanel === "buildMenu" || xrPanel === "palette";

    if (isMenuOpen && !wasMenuOpen.current) {
      // Menu just opened, let's place it in front of the headset!
      const cam = gl.xr.getCamera();
      const target = getSafePanelTransform(cam);

      groupRef.current.position.copy(target.position);
      groupRef.current.quaternion.copy(target.quaternion);
    }

    wasMenuOpen.current = isMenuOpen;
  });

  return <group ref={groupRef} position={[0, -1000, 0]}>{children}</group>;
};
