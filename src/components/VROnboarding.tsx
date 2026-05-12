import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export const VROnboarding = () => {
  const instructions = [
    { key: "Default", action: "Stationary Mode" },
    { key: "X Button", action: "Toggle Build Menu" },
    { key: "Y Button", action: "Toggle Bricks/Colors" },
    { key: "B Button", action: "Close Menu" },
    { key: "R Trigger", action: "Place / Delete / Select" },
    { key: "R Grip Hold", action: "Pick up / Drag" },
    { key: "R Grip Release", action: "Drop / Place" },
    { key: "A Button", action: "Rotate / Cancel" },
    { key: "R Stick", action: "Snap Turn" },
    { key: "RESET POS", action: "available inside radial menu" },
  ];

  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useMemo(() => {
    const canvas = canvasRef.current;
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(17, 17, 17, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 60px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HOW TO BUILD", canvas.width / 2, 100);

      ctx.textAlign = "left";
      ctx.font = "bold 36px sans-serif";
      instructions.forEach((item, i) => {
        const y = 200 + i * 85;
        ctx.fillStyle = "#aaaaaa";
        ctx.fillText(`${item.key}:`, 50, y);
        ctx.fillStyle = "white";
        ctx.font = "36px sans-serif";
        ctx.fillText(item.action, 380, y);
        ctx.font = "bold 36px sans-serif";
      });
    }
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    } else {
      textureRef.current = new THREE.CanvasTexture(canvas);
    }
  }, []);

  return (
    <group position={[0.8, 1.2, -1]} rotation={[0, -0.4, 0]}>
      <mesh>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial map={textureRef.current} transparent />
      </mesh>
    </group>
  );
};
