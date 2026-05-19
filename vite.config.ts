import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'remove-xr-emulate',
      transform(code, id) {
        if (mode === 'production' && id.includes('@pmndrs/xr') && id.includes('store.js')) {
          return {
            code: code.replace(/import\('\.\/emulate\.js'\)/g, 'Promise.resolve({ emulate: () => ({ installRuntime: () => {}, installDevUI: () => {}, installSEM: () => {} }) })'),
            map: null
          };
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      ...(mode === "production" ? [
        { find: /@pmndrs\/xr\/.*emulate\.js$/, replacement: path.resolve(__dirname, "./src/lib/xr-shim.js") },
        { find: /@iwer\/sem\/.*registry\.js$/, replacement: path.resolve(__dirname, "./src/lib/xr-shim.js") },
        { find: "@iwer/devui", replacement: path.resolve(__dirname, "./src/lib/xr-shim.js") },
      ] : []),
    ],
  },
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
          'ui-vendor': ['react', 'react-dom', 'zustand', 'motion', 'lucide-react'],
        },
      },
    },
  },
}));
