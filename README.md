# Legocraft

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

Browser-based 3D brick-building sandbox built with React Three Fiber, Three.js, and WebXR.

Build and edit digital brick structures in the browser with desktop or touch controls, save and reload projects, export creations, and experiment with the same workspace in WebXR.

> **Project status:** Experimental. Desktop and touch interaction are implemented. WebXR functionality is present, but real Meta Quest hardware QA has not yet been completed. See `docs/QUEST_QA.md`.

## Try it

Live application: https://legocraftvr.vercel.app/

## For developers

Legocraft is also an inspectable example of a browser-based 3D construction system: grid-snapped placement, generated brick geometry, connected-object selection, local persistence, GLB export, and experimental WebXR controller interaction all live in the same React Three Fiber codebase.

- [Explore the architecture](docs/ARCHITECTURE.md)
- [Contribute](CONTRIBUTING.md)
- [Review the WebXR / Quest QA matrix](docs/QUEST_QA.md)

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
- Orbit, pan, and zoom camera modes
- Keyboard shortcuts for save, copy/paste, delete, and editing workflows
- Automatic restoration of locally saved builds on startup
- Experimental WebXR mode with controller interaction, haptics, locomotion controls, snap turning, and VR menus

## Run locally

### Requirements

- Node.js 22 recommended
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

These commands are defined in `package.json` and are verified by GitHub Actions on Node.js 22.

## Project files and export

- `.json` project save/import
- `.glb` 3D export
- `.png` screenshots
- automatic local browser persistence

Screenshot capture is best-effort and may depend on browser WebGL behavior.

## Verification and compatibility

GitHub Actions currently verifies the repository on Node.js 22 with:

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

Current compatibility status:

| Environment | Status |
| --- | --- |
| Production build | Verified by CI |
| Automated tests | Verified by CI |
| TypeScript check | Verified by CI |
| Desktop browser interaction | Implemented; no formal cross-browser matrix yet |
| Touch interaction | Implemented; no formal device matrix yet |
| WebXR | Experimental |
| Meta Quest hardware | Not yet tested on real hardware |

## WebXR status

WebXR interaction is implemented, including controller input, haptic feedback, VR menus, locomotion controls, and snap turning.

Real Meta Quest hardware testing has **not** yet been completed, so Quest-specific compatibility and performance should be treated as experimental rather than guaranteed.

See [`docs/QUEST_QA.md`](docs/QUEST_QA.md) for the current hardware QA matrix.

## Build on Legocraft

Any idea is welcome if it can produce a real improvement, experiment, feature, design, tool, performance gain, accessibility gain, or useful extension.

The current game is the starting point, not the ceiling.

Concrete ways to explore or extend the project:

- **Play it:** try the existing builder and identify an interaction or workflow worth improving.
- **Explore the code:** use [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) to find the relevant subsystem.
- **Add a brick:** extend the brick definitions and generated geometry.
- **Build a preset:** add and validate a reusable structure using the existing preset system.
- **Improve interaction:** work on desktop, touch, selection, editing, or camera behavior.
- **Test WebXR:** run the Quest QA procedure and report actual hardware results.
- **Improve XR:** work on controller compatibility, locomotion, haptics, VR UI, or performance.
- **Improve reliability:** add focused tests for placement, selection, presets, or shared domain logic.
- **Open an issue:** discuss larger changes or reproducible limitations before implementation.
- **Submit a pull request:** keep the change focused and run the existing CI commands.

Legocraft is open source under the MIT License. You can fork it, modify it, extend it, and redistribute it under the terms of [`LICENSE`](LICENSE). See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution workflow.

### Current contributor entry points

- [WebXR / Meta Quest hardware validation and extension](https://github.com/Joenasriani/legocraft/issues/1)
- [Move preset validation into automated Vitest coverage](https://github.com/Joenasriani/legocraft/issues/2)
- [Expand automated coverage for placement and selection rules](https://github.com/Joenasriani/legocraft/issues/3)

### Creative and spatial contributions

Coding is not required for every useful contribution. Designers and technical artists can propose preset structures, spatial compositions, new shape concepts, interaction flows, construction challenges, or accessibility improvements through a GitHub issue. Clear sketches, diagrams, reference layouts, and behavior notes are useful when they describe something compatible with the existing builder.

Accepted contributions are credited through the Git history and pull request record; proposal authors should be referenced in the implementation discussion when someone else turns an accepted concept into code.

### WebXR / Quest frontier

Legocraft already includes experimental WebXR interaction, controller input, locomotion, haptics, VR menus and XR-specific building workflows. Real Meta Quest hardware validation is still open. The XR layer is documented and intentionally extensible for developers who want to test, improve, optimize or push it further.

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

**Created by Joe Nasr** — Interactive experiences, 3D and WebXR.

https://joe-nasr-signals.vercel.app/
