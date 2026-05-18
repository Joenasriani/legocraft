import React, { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useLegoStore, BRICK_TYPES, LEGO_COLORS } from "../Store";
import { triggerHaptics, HapticType } from "../lib/haptics";
import { vrTargetManager } from "../lib/vrTargets";
import { getSafePanelTransform } from "../lib/vrHelpers";
import { SHAPE_OPTIONS, PRESET_OPTIONS, ShapeIcon } from "../App";
import { renderToString } from "react-dom/server";

// Create text-only texture (useful for colors)
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

const ColorButton = ({
  position,
  width,
  height,
  color,
  isActive,
  onClick,
  hoverLabel,
}: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const isHovered = hoveredLabel === hoverLabel;

  React.useEffect(() => {
    if (meshRef.current) {
      vrTargetManager.register(meshRef.current, "ui");
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
          color={isActive ? "#ffffff" : isHovered ? color || "#888" : color || "#333"}
          emissive={isActive ? color : "#000"}
          emissiveIntensity={0.5}
        />
      </mesh>
      {isActive && (
        <mesh position={[0, 0, -0.006]}>
          <boxGeometry args={[width + 0.005, height + 0.005, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};

const VRCardButton = ({ position, width, height, isActive, disabled, onClick, hoverLabel, label, svgElement }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const isHovered = hoveredLabel === hoverLabel && !disabled;

  React.useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (svgElement) {
      let str = renderToString(svgElement);
      if (!str.includes("xmlns=")) {
        str = str.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
      }
      str = str.replace(/currentColor/g, "white");

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 256, 256);
        ctx.globalAlpha = disabled ? 0.4 : 1.0;
        ctx.drawImage(img, 64, 32, 128, 128);
        ctx.fillStyle = "white";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label || "", 128, 200);
        
        const t = new THREE.CanvasTexture(canvas);
        setTex(t);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
    } else {
      ctx.clearRect(0, 0, 256, 256);
      ctx.globalAlpha = disabled ? 0.4 : 1.0;
      ctx.fillStyle = "white";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label || "", 128, 128);
      const t = new THREE.CanvasTexture(canvas);
      setTex(t);
    }
  }, [svgElement, label, disabled]);

  React.useEffect(() => {
    if (meshRef.current) {
      vrTargetManager.register(meshRef.current, "ui");
      meshRef.current.userData.isVRMenuItem = true;
      meshRef.current.userData.label = disabled ? `${hoverLabel} (Unsupported)` : hoverLabel;
      meshRef.current.userData.onTrigger = disabled ? () => {} : onClick;
    }
    return () => {
      if (meshRef.current) vrTargetManager.unregister(meshRef.current);
    };
  }, [onClick, hoverLabel, disabled]);

  const bgColor = isActive ? "#38bdf8" : isHovered ? "#333333" : "#1a1a1a";
  const borderColor = isActive ? "#7dd3fc" : isHovered ? "#555" : "#333";

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[width, height, isHovered ? 0.015 : 0.01]} />
        <meshStandardMaterial color={bgColor} transparent opacity={disabled ? 0.4 : 1} />
      </mesh>
      
      {/* Border */}
      <mesh position={[0, 0, 0.0051]}>
        <boxGeometry args={[width * 0.98, height * 0.98, 0.001]} />
        <meshBasicMaterial color={borderColor} transparent opacity={disabled ? 0.2 : isActive ? 0.6 : 0.3} />
      </mesh>

      {tex && (
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[width * 0.8, height * 0.8]} />
          <meshBasicMaterial
            map={tex}
            transparent
            depthTest={false}
            color={isActive ? "#000000" : "#ffffff"}
          />
        </mesh>
      )}
    </group>
  );
};

export const VRPalette = () => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [activeTab, setActiveTab] = useState<"bricks" | "shapes" | "presets">("bricks");
  
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
  const activePreset = useLegoStore((s) => s.activePreset);
  const loadPreset = useLegoStore((s) => s.loadPreset);
  const setMode = useLegoStore((s) => s.setMode);

  if (!visible) return null;

  const PANEL_WIDTH = 0.6;
  const PANEL_HEIGHT = 0.45;
  const LEFT_WIDTH = 0.15;
  const RIGHT_WIDTH = 0.43;

  return (
    <group ref={groupRef} position={[0, 100, 0]}>
      {/* Background Panel */}
      <mesh position={[0, -0.05, -0.01]}>
        <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, 0.005]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.95} />
      </mesh>

      {/* --- LEFT: COLORS --- */}
      <group position={[-PANEL_WIDTH/2 + LEFT_WIDTH/2 + 0.01, 0.08, 0]}>
        <Text position={[0, 0.05, 0.01]} fontSize={0.018} color="#93c5fd" fontWeight="bold">
          COLORS
        </Text>
        {LEGO_COLORS.map((color, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <ColorButton
              key={color}
              position={[(col - 1) * 0.04, -row * 0.04 - 0.02, 0]}
              width={0.035}
              height={0.035}
              color={color}
              isActive={activeColor === color}
              hoverLabel={`Color ${color}`}
              onClick={() => setActiveColor(color)}
            />
          );
        })}
      </group>

      {/* --- RIGHT: CONTENT TABS --- */}
      <group position={[LEFT_WIDTH/2, 0.1, 0]}>
        {/* TABS HEADER */}
        <mesh position={[0, 0.04, 0.005]}>
          <planeGeometry args={[RIGHT_WIDTH, 0.06]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
        <mesh position={[0, 0.01, 0.005]}>
          <planeGeometry args={[RIGHT_WIDTH, 0.002]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>

        {/* Tab Buttons */}
        {[
          { id: "bricks", label: "BRICKS" },
          { id: "shapes", label: "SHAPES" },
          { id: "presets", label: "PRESETS" }
        ].map((tab, i) => {
          const isActive = activeTab === tab.id;
          return (
            <group key={tab.id} position={[-0.14 + i * 0.14, 0.04, 0.01]}>
              <VRCardButton
                width={0.12}
                height={0.04}
                label={tab.label}
                isActive={isActive}
                hoverLabel={`${tab.label} Tab`}
                onClick={() => setActiveTab(tab.id as any)}
              />
            </group>
          );
        })}

        {/* GRID CONTENT */}
        <group position={[0, -0.12, 0]}>
          {activeTab === "bricks" && BRICK_TYPES.map((bt, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            return (
              <VRCardButton
                key={bt}
                position={[-0.16 + col * 0.08, 0.08 - row * 0.08, 0]}
                width={0.075}
                height={0.075}
                label={bt}
                isActive={activeBrickType === bt && !activePreset}
                hoverLabel={`Brick ${bt}`}
                onClick={() => {
                  setActiveBrickType(bt);
                  useLegoStore.getState().loadPreset(null);
                  setMode("Build");
                }}
              />
            );
          })}

          {activeTab === "shapes" && SHAPE_OPTIONS.filter((s) => s.supported).map((shape, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            return (
              <VRCardButton
                key={shape.id}
                position={[-0.16 + col * 0.08, 0.08 - row * 0.08, 0]}
                width={0.075}
                height={0.075}
                label={shape.name.split(" ")[0]}
                svgElement={<ShapeIcon id={shape.id} active={false} supported={true} />}
                isActive={activeBrickType === shape.id && !activePreset}
                hoverLabel={shape.name}
                onClick={() => {
                  setActiveBrickType(shape.id as any);
                  useLegoStore.getState().loadPreset(null);
                  setMode("Build");
                }}
              />
            );
          })}

          {activeTab === "presets" && PRESET_OPTIONS.map((preset, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            return (
              <VRCardButton
                key={preset.id}
                position={[-0.16 + col * 0.08, 0.08 - row * 0.08, 0]}
                width={0.075}
                height={0.075}
                label={preset.name}
                svgElement={preset.icon}
                isActive={activePreset === preset.id}
                hoverLabel={preset.name}
                onClick={() => {
                  if (activePreset === preset.id) {
                    loadPreset(null);
                  } else {
                    loadPreset(preset.id);
                  }
                  useLegoStore.getState().closeXRPanel();
                }}
              />
            );
          })}
        </group>
      </group>
    </group>
  );
};

