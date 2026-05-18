# Brick XR Builder - Production Documentation

**Status: Locomotion-Enabled WebXR Builder Prototype**
*This application is currently in a prototype phase and does not make claims regarding production-readiness, verified refresh rates, or guaranteed smoothness on XR hardware.*

## Supported Devices

**Verified:**
- PC Desktop (Chrome/Edge with WebXR emulator, Standard Desktop)
- Mobile Devices (Standard Touch Builder)

**Target Devices Only (Unverified):**
- Meta Quest 2 / 3 / 3S (Native Quest Browser QA is NOT completed)
- Mobile VR (Limited via Cardboard/Daydream)

## Known Limitations
- Transparent bricks have ordering issues in three.js if not sorted.
- Target warning threshold: 500 bricks. Actual Quest 2 degradation point must be verified on real hardware.
- No real-time physics (bricks are static once placed).

## Control Map
### VR (Quest)
- **Left Thumbstick**: Smooth Locomotion (XZ Plane)
- **Right Thumbstick**: Snap Turning (45° steps)
- **X Button**: Toggle Build Menu
- **Y Button**: Open Palette (only if build menu is closed)
- **Right Trigger (RT)**: Place brick / Activate menu item
- **Right Grip (RG)**: Pick / Move
- **A Button**: Rotate ghost brick only
- **B Button**: Close current XR panel or cancel active move

### Desktop
- **Left Click**: Select / Place
- **Right Click**: Rotate camera (Orbit)
- **Middle Click / Shift+Right**: Pan camera
- **Scroll**: Zoom

## Deployment Requirements
- Must be served over **HTTPS** for WebXR access.
- Local development works on `localhost` without HTTPS.

## Quality Profiles
The app identifies the following hardware profiles (Note: these remain theoretical targets only until real Quest Browser QA is completed. No verified smoothness or refresh rate claims are made):
- **Quest 2 (Target)**: Low buffer scaling.
- **Quest 3/3S (Target)**: Higher buffer scaling.
- **Verified Desktop/Mobile**: Native WebGL scaling, uncapped FPS based on monitor.
