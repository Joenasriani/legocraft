import React, { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLegoStore } from "../Store";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";

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
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const labelTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold 64px sans-serif`;

      // We'll update the texture when hovered changes by re-running this if we want,
      // but for simplicity let's just make it white and use material color.
      // Actually material color multiplies with texture.
      // Let's make the texture have the text in white on transparent.
      ctx.fillStyle = "white";
      ctx.fillText(seg.label, canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    textureRef.current = tex;
    return tex;
  }, [seg.label]);

  React.useEffect(() => {
    return () => {
      if (textureRef.current) textureRef.current.dispose();
    };
  }, []);

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
    <group>
      <mesh ref={meshRef} name="VRMenuItem">
        <boxGeometry args={[boxWidth, boxHeight, depth]} />
        <meshStandardMaterial color={isHovered ? "#ffffff" : seg.color} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[boxWidth * 0.9, boxHeight * 0.9]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent={true}
          color={isHovered ? seg.color : "white"}
        />
      </mesh>
    </group>
  );
};

export const VRRadialMenu = ({
  vrScale,
  currentVRScale,
}: {
  vrScale: "human" | "micro";
  currentVRScale: number;
}) => {
  const { gl } = useThree();
  const [visible, setVisible] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  const mode = useLegoStore((s) => s.mode);
  const setMode = useLegoStore((s) => s.setMode);

  const wasXPressed = useRef(false);
  const wasYPressed = useRef(false);
  const wasAPressed = useRef(false);
  const wasBPressed = useRef(false);

  const fallbackAnchorRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame((state) => {
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    const frame = state.gl.xr.getFrame();
    const refSpace = state.gl.xr.getReferenceSpace();

    if (!session || !frame || !refSpace) {
      if (visible) setVisible(false);
      return;
    }

    let AnyButton4Pressed = false; // X on left, A on right
    let AnyButton5Pressed = false; // Y on left, B on right

    let isLeftTracked = false;
    let leftWristPos: THREE.Vector3 | null = null;
    let leftWristQuat: THREE.Quaternion | null = null;

    for (const inputSource of session.inputSources) {
      if (!inputSource) continue;
      
      if (inputSource.handedness === "left") {
        isLeftTracked = true;
        if (inputSource.gripSpace) {
          const pose = frame.getPose(inputSource.gripSpace, refSpace);
          if (pose) {
            leftWristPos = new THREE.Vector3(
              pose.transform.position.x,
              pose.transform.position.y,
              pose.transform.position.z
            );
            leftWristQuat = new THREE.Quaternion(
              pose.transform.orientation.x,
              pose.transform.orientation.y,
              pose.transform.orientation.z,
              pose.transform.orientation.w
            );
          }
        }
      }

      if (inputSource.gamepad) {
        if (inputSource.handedness === "left") {
          const xPressed = !!inputSource.gamepad.buttons[4]?.pressed;
          if (xPressed && !wasXPressed.current) {
            setVisible(!visible);
            if (!visible && (!leftWristPos)) {
              // about to become visible without a left controller to anchor to
              const camPos = new THREE.Vector3().setFromMatrixPosition(state.camera.matrixWorld);
              const forward = new THREE.Vector3(0, 0, -1).transformDirection(state.camera.matrixWorld).normalize();
              forward.y = 0;
              forward.normalize();
              const distance = vrScale === "human" ? 1.4 : 10;
              fallbackAnchorRef.current.copy(camPos).addScaledVector(forward, distance);
              fallbackAnchorRef.current.y = camPos.y - (vrScale === "human" ? 0.1 : 4);
            }
          }
          wasXPressed.current = xPressed;
        } else if (inputSource.handedness === "right") {
          const bPressed = !!inputSource.gamepad.buttons[5]?.pressed;
          if (bPressed && !wasBPressed.current && visible) {
            setVisible(false);
          }
          wasBPressed.current = bPressed;
        }
      }
    }

    if (groupRef.current && visible) {
      const camPos = new THREE.Vector3().setFromMatrixPosition(state.camera.matrixWorld);
      
      if (leftWristPos && leftWristQuat) {
        // Track the left wrist exactly
        groupRef.current.position.copy(leftWristPos);
        
        // Use controller's local up and forward vectors 
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(leftWristQuat).normalize();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(leftWristQuat).normalize();
        
        const offsetUp = vrScale === "human" ? 0.2 : 1.5;
        const offsetForward = vrScale === "human" ? 0.2 : 1.5;
        
        groupRef.current.position.addScaledVector(up, offsetUp);
        groupRef.current.position.addScaledVector(forward, offsetForward);
        
        if ((import.meta as any).env.DEV) {
          const now = Date.now();
          if (!(window as any)._lastVRMenuAnchorLog || now - (window as any)._lastVRMenuAnchorLog > 5000) {
            (window as any)._lastVRMenuAnchorLog = now;
            console.log("[VR Menu] Anchored to Left Controller", leftWristPos);
          }
        }
      } else {
        // Fallback: Camera anchored statically where it was opened
        groupRef.current.position.copy(fallbackAnchorRef.current);
        
        if ((import.meta as any).env.DEV) {
          const now = Date.now();
          if (!(window as any)._lastVRMenuAnchorLog || now - (window as any)._lastVRMenuAnchorLog > 5000) {
            (window as any)._lastVRMenuAnchorLog = now;
            console.log("[VR Menu] Anchored to Camera Fallback", groupRef.current.position);
          }
        }
      }
      
      // Face the camera specifically
      groupRef.current.lookAt(camPos.x, groupRef.current.position.y, camPos.z);
    }
  });

  React.useEffect(() => {
    useLegoStore.getState().setVrMenuVisible(visible);
  }, [visible]);

  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const [clearArmed, setClearArmed] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setClearArmed(false);
    }
  }, [visible]);

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
    setVisible(false);
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

  const billboardRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (billboardRef.current && visible) {
      billboardRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <group ref={billboardRef}>
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
    </group>
  );
};
