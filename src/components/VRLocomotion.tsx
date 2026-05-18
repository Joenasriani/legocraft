import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin } from "@react-three/xr";
import * as THREE from "three";
import { useLegoStore } from "../Store";

export function VRLocomotion() {
  const originRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const lastSnapTime = useRef(0);
  
  const locomotionMode = useLegoStore((s) => s.locomotionMode);
  const movementSpeed = useLegoStore((s) => s.movementSpeed);
  const snapTurnAngle = useLegoStore((s) => s.snapTurnAngle);

  useFrame((_, delta) => {
    const session = gl.xr.getSession();
    if (!session || !originRef.current) return;

    // We use the XRStore to get input sources if possible, 
    // but gl.xr.getSession().inputSources is more traditional for axes.
    const inputSources = Array.from(session.inputSources);
    const leftInput = inputSources.find((s) => s.handedness === "left");
    const rightInput = inputSources.find((s) => s.handedness === "right");

    // 1. Smooth Movement (Left Stick)
    if (locomotionMode === "Smooth" && leftInput && leftInput.gamepad) {
      const axes = leftInput.gamepad.axes;
      
      // Standard WebXR Gamepad Mapping:
      // [0, 1] usually touchpad
      // [2, 3] usually thumbstick
      const hasThumbstick = axes.length >= 4;
      let x = 0;
      let y = 0;

      if (hasThumbstick) {
        x = axes[2];
        y = axes[3];
        // If thumbstick is idle but secondary (legacy) axes are active, use those
        if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) {
          x = axes[0];
          y = axes[1];
        }
      } else {
        x = axes[0] ?? 0;
        y = axes[1] ?? 0;
      }

      if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
        // Headset-yaw relative movement
        const headsetDir = new THREE.Vector3();
        camera.getWorldDirection(headsetDir);

        // Flatten to XZ plane
        headsetDir.y = 0;
        headsetDir.normalize();

        // If looking straight up/down, default to forward relative to origin? 
        // No, let's just make sure it's not zero.
        if (headsetDir.lengthSq() < 0.001) {
             headsetDir.set(0, 0, -1).applyQuaternion(originRef.current.quaternion);
             headsetDir.y = 0;
             headsetDir.normalize();
        }

        const headsetRight = new THREE.Vector3();
        headsetRight.crossVectors(headsetDir, new THREE.Vector3(0, 1, 0));

        const moveVec = new THREE.Vector3();
        // Forward is -Y on the stick in WebXR gamepad mapping
        moveVec.addScaledVector(headsetDir, -y * movementSpeed * delta);
        moveVec.addScaledVector(headsetRight, x * movementSpeed * delta);

        originRef.current.position.add(moveVec);
      }
    }

    // 2. Snap Turning (Right Stick)
    // Snap turning should probably work even in "Stationary" mode unless we want total lockdown.
    if (rightInput && rightInput.gamepad) {
      const axes = rightInput.gamepad.axes;
      const hasThumbstick = axes.length >= 4;
      const rx = hasThumbstick
        ? Math.abs(axes[2]) > 0.01
          ? axes[2]
          : axes[0]
        : (axes[0] ?? 0);
      
      const now = performance.now();

      // Implement comfort snap turn
      if (Math.abs(rx) > 0.6 && now - lastSnapTime.current > 350) {
        // Angle from store (default 45)
        const angleRad = (snapTurnAngle * Math.PI) / 180;
        const snapAngle = rx > 0 ? -angleRad : angleRad;

        // Current camera world position
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);

        // Rotation axis is global Y
        const rotationAxis = new THREE.Vector3(0, 1, 0);

        // Rotate the origin around the camera's XZ position to avoid nausea
        const pivot = camPos.clone();
        pivot.y = originRef.current.position.y;

        const relativePos = originRef.current.position.clone().sub(pivot);
        relativePos.applyAxisAngle(rotationAxis, snapAngle);

        originRef.current.position.copy(pivot).add(relativePos);
        originRef.current.rotateOnWorldAxis(rotationAxis, snapAngle);

        lastSnapTime.current = now;
      }
    }
  });

  return <XROrigin ref={originRef} position={[0, 0, 1.0]} />;
}
