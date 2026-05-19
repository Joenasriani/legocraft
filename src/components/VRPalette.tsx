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
import { useXRStore } from "@react-three/xr";

// Color buttons
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
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const hoveredLabel = useLegoStore((state) => state.vrMenuHoverContent);
  const isHovered = hoveredLabel === hoverLabel && !disabled;

  React.useEffect(() => {
    const canvas = document.createElement("canvas");
    // Increased resolution for icons
    canvas.width = 512;
    canvas.height = 512;
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
        ctx.clearRect(0, 0, 512, 512);
        ctx.globalAlpha = disabled ? 0.4 : 1.0;
        // Drawing larger for the increased canvas
        ctx.drawImage(img, 64, 64, 384, 384);
        
        const t = new THREE.CanvasTexture(canvas);
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
        t.minFilter = THREE.LinearMipmapLinearFilter;
        setTex(t);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
    } else {
      ctx.clearRect(0, 0, 512, 512);
      ctx.globalAlpha = disabled ? 0.4 : 1.0;
      ctx.fillStyle = "white";
      ctx.font = "bold 128px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label || "", 256, 256);
      const t = new THREE.CanvasTexture(canvas);
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      t.minFilter = THREE.LinearMipmapLinearFilter;
      setTex(t);
    }

    return () => {
      if (tex) tex.dispose();
    };
  }, [svgElement, label, disabled, gl]);

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
        <mesh position={[0, svgElement ? 0.02 : 0, 0.006]}>
          <planeGeometry args={[width * (svgElement ? 0.55 : 0.8), height * (svgElement ? 0.55 : 0.8)]} />
          <meshBasicMaterial
            map={tex}
            transparent
            depthTest={true}
            color={isActive ? "#000000" : "#ffffff"}
          />
        </mesh>
      )}

      {label && svgElement && (
        <Text
          position={[0, -0.065, 0.008]}
          fontSize={0.022}
          color={isActive ? "#000000" : "white"}
          anchorX="center"
          anchorY="middle"
          maxWidth={width * 0.95}
          textAlign="center"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZJhiI2B.woff"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

export const VRPalette = () => {
  const { gl } = useThree();
  const [activeTab, setActiveTab] = useState<"bricks" | "shapes" | "presets">("bricks");
  
  const visible = useLegoStore((s) => s.xrPanel === "palette");

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
    <group>
      {/* Background Panel */}
      <mesh position={[0, -0.05, -0.01]}>
        <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, 0.005]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.95} />
      </mesh>

      {/* --- LEFT: COLORS --- */}
      <group position={[-PANEL_WIDTH/2 + LEFT_WIDTH/2 + 0.01, 0.08, 0]}>
        <Text position={[0, 0.055, 0.01]} fontSize={0.024} color="#93c5fd" fontWeight="bold">
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
            <group key={tab.id} position={[-0.15 + i * 0.15, 0.04, 0.01]}>
              <VRCardButton
                width={0.13}
                height={0.045}
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

