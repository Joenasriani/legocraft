# Legocraft Architecture

This document maps the current codebase for contributors. It describes where major behavior lives and where common extensions should start.

## High-level flow

```text
main.tsx
  -> App.tsx
      -> React / DOM UI
      -> React Three Fiber Canvas
          -> Scene.tsx
              -> brick rendering
              -> placement / move / delete interaction
              -> export
              -> selection tools
              -> WebXR scene behavior

Shared application state and building rules
  -> Store.ts

Reusable geometry and XR helpers
  -> src/lib/*
```

## Core files

### `src/main.tsx`

Application entry point. Mounts the React app and global styles.

### `src/App.tsx`

Top-level application shell.

This file currently owns much of the browser UI and connects the DOM interface to the shared Zustand store and React Three Fiber scene.

Typical changes here:

- top-level menus
- desktop/mobile controls
- save/import UI
- application-level WebXR session setup
- global keyboard/UI actions

### `src/Store.ts`

Central state and building-domain layer.

It currently defines or coordinates:

- brick data types
- rectangular brick sizes
- special shape definitions
- colors
- application modes
- selection state
- clipboard state
- undo/redo state
- placement/support validation
- connected-brick grouping
- preset data
- local persistence
- WebXR UI/control settings

If a contribution changes what a brick is, how placement validity works, which presets exist, or shared interaction state, inspect this file first.

### `src/components/Scene.tsx`

Main 3D interaction and rendering coordinator.

It currently handles or connects:

- the React Three Fiber scene
- brick placement
- brick movement
- placement targets and snapping
- preset placement
- desktop/touch pointer interaction
- camera controls
- GLB export
- PNG screenshot capture
- selection tooling
- WebXR session behavior
- VR overlays and interaction layers

This is a large integration file. Prefer placing reusable logic in a focused component or `src/lib/` helper when adding new systems rather than expanding it unnecessarily.

### `src/components/BrickInstances.tsx`

Renders and interacts with placed bricks.

Relevant for:

- brick mesh interaction
- selected-brick behavior
- move/delete behavior
- multi-selection interaction
- geometry rendering integration

### `src/components/SelectionToolbar.tsx`

Selection editing tools.

Relevant for:

- copy/paste
- multi-object actions
- deletion
- selection workflows

## Adding or changing bricks

Brick definitions begin in `src/Store.ts`.

Important structures include:

- `BrickType`
- `BRICK_TYPES`
- `ALL_VALID_BRICK_TYPES`
- `SHAPE_DEFS`
- `getBrickDimensions()`
- `getBrickHeightUnit()`
- `hasBrickStuds()`

Custom mesh generation lives in:

- `src/lib/geometry.ts`

The main geometry entry points are:

- `createBrickGeometry()`
- `createStudGeometry()`

When adding a new non-rectangular brick type, contributors should check both the domain definition in `Store.ts` and the geometry implementation in `geometry.ts`.

Placement behavior should also be checked against:

- `getBrickAABB()`
- `checkPlacementValid()`
- `areBricksConnected()`
- `hasBrickAbove()`

## Adding presets

Preset names and preset brick data are defined in `src/Store.ts`.

The current preset registry is:

- `PRESETS`

Desktop preset UI is connected through:

- `src/components/PresetMenuOverlay.tsx`

VR preset access is exposed through:

- `src/components/VRPalette.tsx`

Preset transformations use:

- `src/lib/transformUtils.ts`

Useful validation utilities include:

- `getPresetInfo()`
- `checkStructureValid()`
- `isValidBrickData()`

There are also root-level preset inspection scripts:

- `test-presets.ts`
- `test_all_presets.ts`

These are useful development utilities, but the formal automated test suite is the Vitest suite under `src/`.

## Desktop and touch interaction

Most browser interaction is coordinated by:

- `src/App.tsx`
- `src/components/Scene.tsx`
- `src/components/BrickInstances.tsx`
- `src/components/SelectionToolbar.tsx`

Pointer helpers live in:

- `src/lib/pointer.ts`
- `src/lib/pointer.test.ts`

When changing interaction behavior, verify that desktop pointer and touch paths still behave consistently.

## WebXR architecture

WebXR is currently experimental.

The main XR integration points are:

- `src/App.tsx` — XR store/session configuration
- `src/components/Scene.tsx` — XR scene coordination
- `src/components/VRViewLayers.tsx` — controller-driven build/manipulation behavior
- `src/components/VRLocomotion.tsx` — movement and snap-turn behavior
- `src/components/VRRadialMenu.tsx` — VR action menu
- `src/components/VRPalette.tsx` — VR bricks/shapes/presets palette
- `src/VRMenuAnchors.tsx` — VR panel anchoring
- `src/components/VROnboarding.tsx`
- `src/components/VRWaitingPanel.tsx`
- `src/components/VRModeIndicator.tsx`
- `src/components/VRStats.tsx`

XR helper modules:

- `src/lib/xrControllerResolver.ts` — controller/input-source resolution and button/axis helpers
- `src/lib/vrHelpers.ts` — VR readiness and panel transform helpers
- `src/lib/vrTargets.ts` — registered VR interaction targets
- `src/lib/haptics.ts` — controller haptic feedback

Do not claim Meta Quest compatibility from implementation alone. Real headset QA remains tracked in `docs/QUEST_QA.md`.

## Audio

Audio feedback is centralized in:

- `src/components/services/audioService.ts`

Use this service for interaction sounds rather than creating independent audio contexts in new components.

## Shared dimensions and constants

Shared spatial constants live in:

- `src/constants.ts`

This includes brick/grid measurements used by placement and geometry logic.

Changes here can affect placement, geometry, presets, and XR behavior simultaneously.

## Tests and verification

Formal automated tests currently include:

- `src/helpers.test.ts`
- `src/lib/pointer.test.ts`

CI runs:

```bash
npm ci
npm run test
npm run lint
npm run build
```

The workflow lives in:

- `.github/workflows/ci.yml`

Before opening a pull request, run the same commands locally.

## Common contribution paths

### Add a new brick shape

1. Add/update the brick type in `src/Store.ts`.
2. Define its dimensions/behavior in `SHAPE_DEFS` or related helpers.
3. Implement its geometry in `src/lib/geometry.ts`.
4. Verify placement/support behavior.
5. Expose it in the relevant desktop/VR menus if appropriate.
6. Add tests where the new behavior can be validated.
7. Run CI commands.

### Add a new preset

1. Add the preset name/type in `src/Store.ts`.
2. Add the preset brick data/generator.
3. Register it in `PRESETS`.
4. Add its UI option where needed.
5. Validate placement at supported rotations.
6. Run CI commands.

### Change WebXR controls

1. Inspect `VRViewLayers.tsx`, `VRLocomotion.tsx`, and `xrControllerResolver.ts`.
2. Preserve shared store state semantics.
3. Verify non-XR behavior remains unaffected.
4. Document the exact headset/controller used for real-device testing.
5. Update `docs/QUEST_QA.md` only with actual hardware results.

### Add a new editing tool

1. Decide whether the state belongs in `Store.ts`.
2. Keep reusable tool logic outside `Scene.tsx` when practical.
3. Add browser UI in a focused component.
4. Add an XR equivalent only when the interaction is genuinely supported.
5. Add tests for shared domain logic.

## Current architectural limitation

`App.tsx` and `Scene.tsx` are both large integration files and are the main current maintainability hotspots.

Contributors should prefer small focused modules for new reusable behavior so the integration files do not grow unnecessarily.
