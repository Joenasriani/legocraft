# Quest VR QA Report

Quest hardware QA still pending.

## Runtime interaction readiness
- InstancedMesh remounting optimized
- VR building ghost uses `BrickInstances`
- TargetRay / Grip mapping updated dynamically through `inputsourceschange`
- Visibility tracking and audio resume hooked into `Scene.tsx`

## Quest performance readiness
- Excluded high-cost components (`ContactShadows`, `Environment`, `Stars`) from VR mode cache.
- `gridHelper` division count minimized when in VR.
- `Raycaster` allocated securely inside a `useRef`.
- WebXR Emulator completely stripped from production (`import.meta.env.DEV` conditions active).
