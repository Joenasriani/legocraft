# Legocraft

Browser-based 3D brick-building sandbox built with React Three Fiber, Three.js, and WebXR.

Build and edit digital brick structures in the browser with desktop or touch controls, save and reload projects, export creations, and experiment with the same workspace in WebXR.

> **Project status:** Experimental. Desktop and touch interaction are implemented. WebXR functionality is present, but real Meta Quest hardware QA has not yet been completed. See `docs/QUEST_QA.md`.

## Try it

Live application: https://legocraftvr.vercel.app/

## Features

- Place, move, rotate, recolor, and delete bricks on a snapped 3D building grid
- Multiple rectangular brick sizes plus round, cone, dome, slope, curved, wedge, triangle, and arch shapes
- Solo, multi-object, and connected-group selection
- Copy/paste, undo, and redo
- Built-in presets: Horse, Sheep, Car, Road, Mountain, Tree, Cabin, Water Well, Pine Tree, and Castle
- Local browser persistence
- Save and import project data as `.json`
- Export the current structure as `.glb`
- Export screenshots as `.png`
- Desktop and touch interaction
- Experimental WebXR mode with controller interaction, haptics, locomotion controls, snap turning, and VR menus

## Run locally

### Requirements

- Node.js
- npm
- A browser with WebGL support

### Install

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### Start the development server

```bash
npm run dev
```

The Vite development server is configured for port `3000`.

A successful first run should load the 3D building workspace in the browser and allow you to place and manipulate bricks.

### Verify the project

```bash
npm run test
npm run lint
npm run build
```

These commands are defined in `package.json`. They were not executed as part of this documentation pass.

## Project files and export

- `.json` project save/import
- `.glb` 3D export
- `.png` screenshots
- automatic local browser persistence

Screenshot capture is best-effort and may depend on browser WebGL behavior.

## WebXR status

WebXR interaction is implemented, including controller input, haptic feedback, VR menus, locomotion controls, and snap turning.

Real Meta Quest hardware testing has **not** yet been completed, so Quest-specific compatibility and performance should be treated as experimental rather than guaranteed.

See [`docs/QUEST_QA.md`](docs/QUEST_QA.md) for the current hardware QA matrix.

## Build on Legocraft

The project has clear extension surfaces for developers who want to fork and evolve it:

- add brick types and custom geometry
- add preset structures
- add environments
- improve desktop, touch, or XR interaction
- improve controller compatibility
- test and optimize Quest performance
- add new editing tools
- improve export workflows
- add automated tests and documentation

Legocraft is open source under the MIT License. You can fork it, modify it, extend it, and redistribute it under the terms of [`LICENSE`](LICENSE). See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution workflow.

## Stack

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest
