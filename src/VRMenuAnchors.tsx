import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useXRStore } from "@react-three/xr";
import { getSafePanelTransform } from "./lib/vrHelpers";

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
  const xrStore = useXRStore();

  useFrame((_, delta) => {
    if (!gl.xr.isPresenting || !groupRef.current) return;

    const xrState = xrStore.getState() as any;
    const inputSources = Array.from(xrState.inputSourceStates || []) as any[];
    const leftState = inputSources.find((s) => s.inputSource.handedness === "left" && !s.inputSource.hand);
    const leftController = leftState?.object;

    if (leftController) {
      const worldPos = new THREE.Vector3().setFromMatrixPosition(leftController.matrixWorld);
      const worldQuat = new THREE.Quaternion().setFromRotationMatrix(leftController.matrixWorld);
      
      const cam = gl.xr.getCamera();
      const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      
      // Target position slightly above the hand
      const targetPos = worldPos.clone().add(new THREE.Vector3(0, 0.2, 0).applyQuaternion(worldQuat));
      
      const lookAtQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(targetPos, camPos, new THREE.Vector3(0, 1, 0));
      // Panel front (+Z) should face camera. lookAt points -Z at target, so rotate 180deg around Y.
      lookAtQuat.setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));
      
      groupRef.current.position.lerp(targetPos, delta * 12);
      groupRef.current.quaternion.slerp(lookAtQuat, delta * 12);
    } else {
      // Fallback to head-locked panel
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

  return <group ref={groupRef} position={[0, 100, 0]}>{children}</group>;
};
