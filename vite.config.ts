import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-addons': ['three-stdlib', 'three-mesh-bvh', '@react-three/drei'],
          'xr-vendor': ['@react-three/xr'],
          'ui-vendor': ['react', 'react-dom', 'zustand', 'motion', 'lucide-react'],
        },
      },
    },
  },
});
