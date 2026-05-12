# Desktop & Mobile QA

## Platform Interaction
- Desktop: Full left/right click + Mouse scroll for zoom. Left click paints/deletes. Right click drags camera.
- Mobile: Touch down paints/deletes immediately, long touch context actions. Two fingers zoom/drag camera.

## Screen Configuration
- Desktop UI fits perfectly.
- Mobile has safe-area-inset injected for avoiding notches.
- Mobile allows `viewport-fit=cover` to stretch landscape.

## Screenshots
- Screenshots now leverage `preserveDrawingBuffer` across both desktop Safari/Chrome and Mobile WebKit devices reducing black screen outputs.

## WebXR / VR Wait States
- Entering immersive XR can take up to 3 seconds on a Meta Quest depending on the system's memory allocation and if the site needs to request boundaries. 
- A loading / "Entering VR..." overlay appears during handover.

## Performance
- Stale bundles: The browser caches Vite/React output sometimes aggressively, manually clear cache (Empty Cache & Hard Reload) if testing continuous builds iteratively directly from an external device across the network using the developer host port.
