import React, { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLegoStore, BRICK_TYPES } from "../Store";
import { triggerHaptics, HapticType } from "../lib/haptics";
import { vrTargetManager } from "../lib/vrTargets";

const PRESET_COLORS = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ffffff",
  "#888888",
  "#222222",
  "#8b4513",
  "#ffa500",
  "#800080",
];

const createTextTexture = (text: string, color: string, bgColor: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  return new THREE.CanvasTexture(canvas);
};

const PaletteButton = ({
  position,
  width,
  height,
  color,
  label,
  isActive,
  onClick,
  hoverLabel,
}: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(
    () => (label ? createTextTexture(label, "white", "transparent") : null),
    [label],
  );
  
  React.useEffect(() => {
    return () => {
      if (tex) tex.dispose();
    };
  }, [tex]);

  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const isHovered = hoveredLabel === hoverLabel;

  React.useEffect(() => {
    if (meshRef.current) {
      vrTargetManager.register(meshRef.current);
      meshRef.current.userData.isVRMenuItem = true;
      meshRef.current.userData.label = hoverLabel;
      meshRef.current.userData.onTrigger = onClick;
    }
    return () => {
      if (meshRef.current) vrTargetManager.unregister(meshRef.current);
    };
  }, [onClick, hoverLabel]);

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[width, height, isHovered ? 0.015 : 0.01]} />
        <meshStandardMaterial
          color={
            isActive ? "#ffffff" : isHovered ? color || "#888" : color || "#333"
          }
          emissive={isActive ? color : "#000"}
          emissiveIntensity={0.5}
        />
      </mesh>
      {tex && (
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[width * 0.9, height * 0.9]} />
          <meshBasicMaterial
            map={tex}
            transparent
            depthTest={false}
            color={isActive ? "#000" : "#fff"}
          />
        </mesh>
      )}
      {isActive && (
        <mesh position={[0, 0, -0.006]}>
          <boxGeometry args={[width + 0.005, height + 0.005, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};

import { getSafePanelTransform } from "../lib/vrHelpers";

export const VRPalette = () => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  const visible = useLegoStore((s) => s.xrPanel === "palette");

  const hasPlacedRef = useRef(false);

  React.useEffect(() => {
    if (!visible) {
      hasPlacedRef.current = false;
    }
  }, [visible]);

  useFrame((state, delta) => {
    if (!visible || !gl.xr.isPresenting || !groupRef.current) return;
    if (hasPlacedRef.current) return;

    const cam = gl.xr.getCamera();
    const target = getSafePanelTransform(cam);
    
    groupRef.current.position.copy(target.position);
    groupRef.current.quaternion.copy(target.quaternion);
    hasPlacedRef.current = true;
  });

  const activeColor = useLegoStore((s) => s.selectedColor);
  const setActiveColor = useLegoStore((s) => s.setSelectedColor);
  const activeBrickType = useLegoStore((s) => s.selectedType);
  const setActiveBrickType = useLegoStore((s) => s.setSelectedType);

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, 100, 0]}>
      {/* Background Panel */}
      <mesh position={[0, -0.05, -0.01]}>
        <boxGeometry args={[0.35, 0.35, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.9} />
      </mesh>

      {/* Colors Grid */}
      <group position={[-0.12, 0.05, 0]}>
        {PRESET_COLORS.map((color, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          return (
            <PaletteButton
              key={color}
              position={[col * 0.05, -row * 0.05, 0]}
              width={0.04}
              height={0.04}
              color={color}
              isActive={activeColor === color}
              hoverLabel={`Color ${color}`}
              onClick={() => setActiveColor(color)}
            />
          );
        })}
      </group>

      {/* Bricks Grid */}
      <group position={[-0.12, -0.15, 0]}>
        {BRICK_TYPES.map((bt, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          return (
            <PaletteButton
              key={bt}
              position={[col * 0.06, -row * 0.05, 0]}
              width={0.055}
              height={0.04}
              color="#444"
              label={`${bt}`}
              isActive={activeBrickType === bt}
              hoverLabel={`Brick ${bt}`}
              onClick={() => setActiveBrickType(bt)}
            />
          );
        })}
      </group>
    </group>
  );
};
