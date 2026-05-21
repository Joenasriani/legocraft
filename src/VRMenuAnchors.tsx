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

      const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      const camFwd = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);

      // Flatten forward on Y to prevent tilting
      camFwd.y = 0;
      if (camFwd.lengthSq() < 0.001) camFwd.set(0, 0, -1);
      camFwd.normalize();

      // 1.2m to 1.8m -> ~1.4m is good.
      const distance = 1.4;

      // Slightly below eye level
      const targetPos = camPos.clone().add(camFwd.multiplyScalar(distance));
      targetPos.y = Math.max(0.6, camPos.y - 0.25);

      const lookAtQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(targetPos, camPos, new THREE.Vector3(0, 1, 0));
      // Panel front (+Z) should face camera. lookAt points -Z at target, so rotate 180deg around Y.
      lookAtQuat.setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));

      groupRef.current.position.copy(targetPos);
      groupRef.current.quaternion.copy(lookAtQuat);
    }

    wasMenuOpen.current = isMenuOpen;
  });

  return <group ref={groupRef} position={[0, -1000, 0]}>{children}</group>;
};
