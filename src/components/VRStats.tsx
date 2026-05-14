import React, { useState, useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLegoStore } from "../Store";

export const VRStats = () => {
  const { gl } = useThree();
  const [stats, setStats] = useState({
    fps: 0,
    triangles: 0,
    drawCalls: 0,
    bricks: 0,
    frameTime: 0,
    sessionDuration: 0,
  });

  const brickCount = useLegoStore((state) => state.bricks.length);
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  const sessionStartTime = useRef(performance.now());
  const lastUpdate = useRef(0);

  useFrame((state) => {
    frames.current++;
    const time = performance.now();

    if (time >= lastUpdate.current + 1000) {
      const fps = Math.round(
        (frames.current * 1000) / (time - lastUpdate.current),
      );
      const frameTime = (time - prevTime.current).toFixed(2);

      const info = gl.info;
      setStats({
        fps,
        triangles: info.render.triangles,
        drawCalls: info.render.calls,
        bricks: brickCount,
        frameTime: Number(frameTime),
        sessionDuration: Math.round((time - sessionStartTime.current) / 1000),
      });

      frames.current = 0;
      lastUpdate.current = time;
    }
    prevTime.current = time;
  });

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const warnings = useMemo(() => {
    const alerts = [];
    if (stats.fps > 0 && stats.fps < 72) alerts.push("LOW FPS");
    if (stats.drawCalls > 100) alerts.push("HIGH DRAW CALLS");
    if (stats.triangles > 150000) alerts.push("HIGH TRIANGLES");
    if (stats.bricks > 500) alerts.push("HIGH BRICK COUNT");
    return alerts;
  }, [stats]);

  const text = useMemo(() => {
    let base = [
      `FPS: ${stats.fps}`,
      `Frame Time: ${stats.frameTime}ms`,
      `Draw Calls: ${stats.drawCalls}`,
      `Triangles: ${stats.triangles.toLocaleString()}`,
      `Bricks: ${stats.bricks}`,
      `Session: ${formatDuration(stats.sessionDuration)}`,
    ].join("\n");

    if (warnings.length > 0) {
      base += "\n\n" + warnings.map((w) => `⚠️ ${w}`).join("\n");
    }
    return base;
  }, [stats, warnings]);

  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "bold 32px sans-serif";

      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (line.includes("⚠️")) {
          ctx.fillStyle = "#ef4444";
        } else {
          ctx.fillStyle = "white";
        }
        ctx.fillText(line, 20, 50 + i * 45);
      });
    }
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [text]);

  const panelHeight = 0.4 + (warnings.length > 0 ? warnings.length * 0.04 : 0);

  // Initialize texture eagerly so it's not null on first render
  const texture = useMemo(() => {
    if (!textureRef.current) {
      textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    }
    return textureRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (textureRef.current) textureRef.current.dispose();
    };
  }, []);

  return (
    <group position={[-0.8, 1.2, -1]} rotation={[0, 0.4, 0]}>
      <mesh>
        <planeGeometry args={[0.5, panelHeight]} />
        <meshBasicMaterial map={textureRef.current} transparent />
      </mesh>
    </group>
  );
};
