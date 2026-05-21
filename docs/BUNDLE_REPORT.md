# Bundle Size Report (Production Build)

*Generated on 2026-05-10*

## Build Summary
The following chunks were generated during the production build (`npm run build`). The **Circular Chunk Warning is GONE**.

| File | Size | Gzip Size | Notes |
|------|------|-----------|-------|
| `index.html` | 0.50 kB | 0.31 kB | Entry HTML |
| `index.js` (main) | 1,685.98 kB | 475.34 kB | Main entry chunk (React + dependencies) |
| `emulate.js` | 1,363.26 kB | 356.72 kB | WebXR Emulation logic |
| `Scene.js` | 77.85 kB | 23.25 kB | Main 3D Scene component |
| `index.css` | 34.29 kB | 6.53 kB | Tailwind CSS Styles |

## Dynamic & Split Assets
*These components are loaded via dynamic imports (React.lazy or dynamic environment loading).*

| Asset | Size | Gzip Size |
|-------|------|-----------|
| `music_room.js` | 2,087.28 kB | 715.05 kB |
| `living_room.js` | 1,500.39 kB | 516.29 kB |
| `office_large.js` | 548.70 kB | 199.40 kB |
| `meeting_room.js` | 409.87 kB | 142.60 kB |
| `office_small.js` | 97.84 kB | 37.50 kB |
| `PresetMenuOverlay.js` | 2.18 kB | 0.86 kB |
| `ClearConfirmModal.js` | 2.13 kB | 0.72 kB |
| `HelpModal.js` | 1.60 kB | 0.69 kB |

## Bundle Bloat Analysis
- **Circular Chunks Resolved**: Custom `manualChunks` logic is used to cleanly separate libraries (e.g., `three-core`, `three-addons`, `ui-vendor`) and resolve circular dependency warnings.
- **Initial Load**: The initial entry chunk (`index.js`) is ~1.68 MB. While significantly smaller than the previous circular-bloated vendor chunk, it remains large due to core 3D dependencies.
- **Probable Bloat Causes**:
    - **@react-three/drei & three**: These provide the underlying 3D engine and utilities. They are robust but heavy.
    - **@react-three/xr**: Handles the WebXR integration.
    - **framer-motion (motion)**: Used for UI animations.
    - **lucide-react**: Icon library.
- **Large Chunks**: Chunks exceeding 500 kB (index, emulate, living_room, music_room, office_large) are flagged due to high density of 3D data or library code.
- **Status on Bloat**: Bundle bloat is "managed" but not "fixed". The app is now properly code-split, allowing the browser to load data components only when needed.

> [!WARNING]
> **Bundle Risk Note**: Large chunks remain and must be tested on real Quest Browser hardware before claiming smooth startup or production readiness. Chunks like `music_room` and `living_room` contain significant baked geometry or logic that may impact initial memory overhead on mobile XR chipsets.
