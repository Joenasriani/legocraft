import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as THREE from "three";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree as any;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree as any;
THREE.Mesh.prototype.raycast = acceleratedRaycast as any;

const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error("Critical Error: Element with ID 'root' was not found in the DOM. Failed to mount the application.");
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
