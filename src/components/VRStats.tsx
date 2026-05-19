import { useState, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
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

  useFrame(() => {
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

  const panelHeight = 0.4 + (warnings.length > 0 ? warnings.length * 0.04 : 0);

  return (
    <group position={[-0.8, 1.2, -1]} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.5, panelHeight]} />
        <meshBasicMaterial color="#111111" transparent opacity={0.7} />
      </mesh>
      
      <Text
        position={[-0.23, panelHeight / 2 - 0.05, 0]}
        color="white"
        fontSize={0.03}
        anchorX="left"
        anchorY="top"
        lineHeight={1.4}
        font="https://fonts.gstatic.com/s/jetbrainsmono/v18/t6q208pq9Wuv_pXfK.woff"
      >
        {`FPS: ${stats.fps}\nFrame Time: ${stats.frameTime}ms\nDraw Calls: ${stats.drawCalls}\nTriangles: ${stats.triangles.toLocaleString()}\nBricks: ${stats.bricks}\nSession: ${formatDuration(stats.sessionDuration)}`}
      </Text>

      {warnings.length > 0 && (
        <Text
          position={[-0.23, -panelHeight / 2 + 0.05 + (warnings.length * 0.04), 0]}
          color="#ef4444"
          fontSize={0.025}
          anchorX="left"
          anchorY="top"
          lineHeight={1.4}
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/t6q208pq9Wuv_pXfK.woff"
        >
          {warnings.map((w) => `⚠️ ${w}`).join("\n")}
        </Text>
      )}
    </group>
  );
};
