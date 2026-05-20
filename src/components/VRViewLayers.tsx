import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore, getGroupBricks, hasBrickAbove } from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "../constants";
import { audioService } from "./services/audioService";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";
import { isQuestControllerReady, getVRTargetRay } from "../lib/vrHelpers";

import { useXRStore } from "@react-three/xr";

const isDebugXR =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugXR") === "1";

interface ControllerActions {
  trigger: boolean;
  grip: boolean;
  primary: boolean; // A or X
  secondary: boolean; // B or Y
  stick: boolean;
}

const getControllerActions = (input: XRInputSource | null): ControllerActions => {
  if (!input || !input.gamepad) {
    return {
      trigger: false,
      grip: false,
      primary: false,
      secondary: false,
      stick: false,
    };
  }
  const gp = input.gamepad;
  return {
    trigger: gp.buttons[0]?.pressed || false,
    grip: gp.buttons[1]?.pressed || false,
    primary: gp.buttons[4]?.pressed || false,
    secondary: gp.buttons[5]?.pressed || false,
    stick: gp.buttons[3]?.pressed || gp.buttons[10]?.pressed || false,
  };
};

export const HumanViewLayer = ({
  currentVRScale,
  sceneGroupRef,
  updateGhostPosition,
  handleVRCommit,
  setHasPlacementCandidate,
}: {
  currentVRScale: number;
  sceneGroupRef: React.RefObject<THREE.Group | null>;
  updateGhostPosition: (
    p: THREE.Vector3,
    n: THREE.Vector3,
    tk?: string,
  ) => void;
  handleVRCommit: (p: THREE.Vector3, n: THREE.Vector3, tk: string) => boolean;
  setHasPlacementCandidate: (val: boolean) => void;
}) => {
  const xrStore = useXRStore();
  const { gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster()).current;

  // We rely on useXRStore for controller detection instead of gl.xr

  const mode = useLegoStore((s) => s.mode);
  const bricks = useLegoStore((s) => s.bricks);
  const removeBricks = useLegoStore((s) => s.removeBricks);
  const removeBrick = useLegoStore((s) => s.removeBrick);
  const movingBrickId = useLegoStore((s) => s.movingBrickId);
  const setMovingBrickId = useLegoStore((s) => s.setMovingBrickId);
  const setIsDraggingBrick = useLegoStore((s) => s.setIsDraggingBrick);
  const setJustSelectedBrick = useLegoStore((s) => s.setJustSelectedBrick);
  const selectionMode = useLegoStore((s) => s.selectionMode);

  const wasTriggerPressed = useRef(false);
  const wasSqueezePressed = useRef(false);
  const wasActionPressed = useRef(false);
  const wasRecenterPressed = useRef(false);
  const squeezeStartPosRef = useRef<THREE.Vector3 | null>(null);
  const wasXPressed = useRef(false);
  const wasYPressed = useRef(false);
  const wasBPressed = useRef(false);
  const squeezeMoveBlockedRef = useRef(false);
  const movePreviewActiveRef = useRef(false);
  const snapTurnCooldown = useRef(false);
  const menuClickActiveRef = useRef(false);

  const isValidTarget = (obj: THREE.Object3D) => {
    let curr: THREE.Object3D | null = obj;
    let isMenu = false;
    while (curr) {
      if (
        curr.userData?.isGhost ||
        curr.name?.includes("ghost") ||
        curr.name?.startsWith("presetPreview") ||
        curr.name === "GridHelper"
      ) {
        return false;
      }
      if (curr.userData?.isVRMenuItem) isMenu = true;
      curr = curr.parent;
    }

    // VR target priority
    const xrPanel = useLegoStore.getState().xrPanel;

    if (xrPanel === "buildMenu" || xrPanel === "palette") {
      // Priority to menu items when interactive panels are open.
      // This prevents accidental clicks through the panel to the world.
      return isMenu;
    } else if (xrPanel === "none") {
      // Normal building mode, ignore menu items (radial menu is closed)
      return !isMenu;
    } else {
      // onboarding, error, waitingControllers - no interaction with world or menu
      return false;
    }
  };

  const laserRef = useRef<THREE.Mesh>(null);
  const hoverMarkerRef = useRef<THREE.Mesh>(null);

  const laserGeo = React.useMemo(() => {
    const geo = new THREE.BoxGeometry(0.005, 0.005, 1);
    geo.translate(0, 0, -0.5); // Pivot at the start of the laser
    return geo;
  }, []);

  const [aimedBrickPoint, setAimedBrickPoint] = useState<{
    p: THREE.Vector3;
    n: THREE.Vector3;
  } | null>(null);

  const latestHit = useRef<any>(null);
  const latestValidPlacement = useRef<{
    p: THREE.Vector3;
    n: THREE.Vector3;
    tk: string;
  } | null>(null);

  const canonicalRightHitRef = useRef<{
    rawHit: any;
    pointWorld: THREE.Vector3;
    normalWorld: THREE.Vector3;
    pointLocal: THREE.Vector3;
    targetKind: string;
    isValidPlacement: boolean;
    distance: number;
  } | null>(null);

  const clearGhost = () => {
    updateGhostPosition(
      new THREE.Vector3(0, -1000, 0),
      new THREE.Vector3(0, 1, 0),
      "none",
    );
    latestValidPlacement.current = null;
    setHasPlacementCandidate(false);
  };

  const requestCommit = (p: THREE.Vector3, n: THREE.Vector3, tk: string, rightInput: XRInputSource | null) => {
    const success = handleVRCommit(p, n, tk);
    if (success) {
      if (rightInput) triggerHaptics(rightInput, HapticType.BRICK_PLACE);
      // "Move" mode uses updateBricks which has no sound, so we play it here.
      // addBrick and commitPreset already play "place" internally.
      if (mode === "Move") {
        audioService.play("place");
      }
      movePreviewActiveRef.current = false;
      return true;
    } else {
      if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
      // commitPreset already plays "error" if it fails.
      // For Build mode, we play it here since the Store doesn't check validity in addBrick.
      if (!useLegoStore.getState().activePreset) {
        audioService.play("error");
      }
      return false;
    }
  };

  const performVRDelete = (brick: any, rightInput: XRInputSource | null) => {
    const store = useLegoStore.getState();
    const allBricks = store.bricks;

    if (store.selectionMode === "Group") {
      const g = getGroupBricks(brick, allBricks);
      const gIds = g.map((bz: any) => bz.id);
      const isBlocked = g.some((bz: any) =>
        hasBrickAbove(bz, allBricks, MODULE_SIZE, BRICK_HEIGHT, gIds),
      );

      if (isBlocked) {
        store.setToastMessage("Cannot delete: selection is blocked by other bricks on top.");
        setTimeout(() => store.setToastMessage(null), 3000);
        if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
      } else {
        store.removeBricks(gIds);
        if (rightInput) triggerHaptics(rightInput, HapticType.BRICK_DELETE);
      }
    } else if (store.selectionMode === "Multi") {
      const multiIds = store.multiSelectedBrickIds;
      const isPart = multiIds.includes(brick.id);
      const idsToDelete = isPart ? multiIds : [brick.id];

      const isBlocked = idsToDelete.some((id) => {
        const br = allBricks.find((bk) => bk.id === id);
        return (
          br &&
          hasBrickAbove(br, allBricks, MODULE_SIZE, BRICK_HEIGHT, idsToDelete)
        );
      });

      if (isBlocked) {
        store.setToastMessage(
          idsToDelete.length > 1
            ? "Cannot delete selection: blocked by other bricks."
            : "Cannot delete: brick has another brick above it.",
        );
        setTimeout(() => store.setToastMessage(null), 3000);
        if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
      } else {
        store.removeBricks(idsToDelete);
        if (isPart) {
          store.setMultiSelectedBrickIds([]);
        }
        if (rightInput) triggerHaptics(rightInput, HapticType.BRICK_DELETE);
      }
    } else {
      if (hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT)) {
        store.setToastMessage("Cannot delete: brick has another brick above it.");
        setTimeout(() => store.setToastMessage(null), 3000);
        if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
      } else {
        store.removeBrick(brick.id);
        if (rightInput) triggerHaptics(rightInput, HapticType.BRICK_DELETE);
      }
    }
  };

  const performVRSelection = (brick: any, rightInput: XRInputSource | null, controllerPos: THREE.Vector3) => {
    const store = useLegoStore.getState();
    const allBricks = store.bricks;

    if (store.selectionMode === "Group") {
      const g = getGroupBricks(brick, allBricks);
      const gIds = g.map((bz: any) => bz.id);
      const isBlocked = g.some((bz: any) =>
        hasBrickAbove(bz, allBricks, MODULE_SIZE, BRICK_HEIGHT, gIds),
      );

      store.setMovingBrickId(brick.id);
      store.setIsDraggingBrick(false);
      squeezeMoveBlockedRef.current = isBlocked;
      movePreviewActiveRef.current = false;
      squeezeStartPosRef.current = controllerPos.clone();

      if (isBlocked) {
        store.setToastMessage("Cannot move: selection is blocked by other bricks on top.");
        setTimeout(() => store.setToastMessage(null), 3000);
        if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
        audioService.play("error");
        return;
      }
    } else if (store.selectionMode === "Multi") {
      const stateBefore = useLegoStore.getState();
      stateBefore.toggleMultiSelectBrickId(brick.id);
      const stateAfter = useLegoStore.getState();
      const isNowSelected = stateAfter.multiSelectedBrickIds.includes(brick.id);

      if (isNowSelected) {
        store.setMovingBrickId(brick.id);
        const isBlocked = stateAfter.multiSelectedBrickIds.some((id) => {
          const br = stateAfter.bricks.find((bk) => bk.id === id);
          return (
            br &&
            hasBrickAbove(
              br,
              stateAfter.bricks,
              MODULE_SIZE,
              BRICK_HEIGHT,
              stateAfter.multiSelectedBrickIds,
            )
          );
        });
        store.setIsDraggingBrick(false);
        squeezeMoveBlockedRef.current = isBlocked;
        movePreviewActiveRef.current = false;
        squeezeStartPosRef.current = controllerPos.clone();

        if (isBlocked) {
          store.setToastMessage("Cannot move: selection is blocked by other bricks on top.");
          setTimeout(() => store.setToastMessage(null), 3000);
          if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
          audioService.play("error");
          return;
        }
      } else if (stateBefore.movingBrickId === brick.id) {
        const newAnchorId = stateAfter.multiSelectedBrickIds[stateAfter.multiSelectedBrickIds.length - 1];
        store.setMovingBrickId(newAnchorId || null);
        squeezeMoveBlockedRef.current = false;
        movePreviewActiveRef.current = false;
        store.setIsDraggingBrick(false);
      }
    } else {
      const isBlocked = hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT);
      store.setMovingBrickId(brick.id);
      store.setIsDraggingBrick(false);
      squeezeMoveBlockedRef.current = isBlocked;
      movePreviewActiveRef.current = false;
      squeezeStartPosRef.current = controllerPos.clone();

      if (isBlocked) {
        store.setToastMessage("Cannot move: selection is blocked by other bricks on top.");
        setTimeout(() => store.setToastMessage(null), 3000);
        if (rightInput) triggerHaptics(rightInput, HapticType.ERROR);
        audioService.play("error");
        return;
      }
    }

    store.setJustSelectedBrick(true);
    if (rightInput) triggerHaptics(rightInput, HapticType.BRICK_SELECT);
    audioService.play("select");
    store.triggerSetGhostRotation(brick.rotation);
  };

  const debugTextRef = useRef<any>(null);

  useFrame((state, delta, xrFrameArg) => {
    const xrState = xrStore.getState();
    const session = xrState.session;
    if (!session || !sceneGroupRef.current) return;

    // Standardize frame and reference space retrieval
    const xrFrame = xrFrameArg || gl.xr.getFrame();
    const referenceSpace = (xrState as any).originReferenceSpace || gl.xr.getReferenceSpace();

    let leftController: THREE.Object3D | null = null;
    let rightController: THREE.Object3D | null = null;
    let leftInput: XRInputSource | null = null;
    let rightInput: XRInputSource | null = null;

    const inputSourcesArray = Array.from(xrState.inputSourceStates);
    
    // Improved detection: find by handedness first, then check if it is a controller (not a hand)
    let rightState = inputSourcesArray.find(
      (s) => s.inputSource.handedness === "right" && !s.inputSource.hand,
    ) as any;
    let leftState = inputSourcesArray.find(
      (s) => s.inputSource.handedness === "left" && !s.inputSource.hand,
    ) as any;

    if (isDebugXR) {
      const now = Date.now();
      if (!(window as any)._lastVRLaserLog || now - (window as any)._lastVRLaserLog > 1000) {
        (window as any)._lastVRLaserLog = now;
        console.log("[VR] Controller Match:", {
          leftFound: !!leftState,
          rightFound: !!rightState,
          rightObjName: rightState?.object?.name || "none",
          leftObjName: leftState?.object?.name || "none",
          inputSources: inputSourcesArray.map(s => ({
            handedness: s.inputSource.handedness,
            profiles: s.inputSource.profiles
          }))
        });
      }
    }

    if (rightState) {
      rightInput = rightState.inputSource;
      rightController = rightState.object;
    }
    if (leftState) {
      leftInput = leftState.inputSource;
      leftController = leftState.object;
    }

    if ((import.meta as any).env.DEV) {
      if (leftController && !(leftController as any)._hasLogged) {
        console.log("[VR] left controller found in useFrame");
        (leftController as any)._hasLogged = true;
      }
      if (rightController && !(rightController as any)._hasLogged) {
        console.log("[VR] right controller found in useFrame");
        (rightController as any)._hasLogged = true;
      }
    }

    const store = useLegoStore.getState();
    const currentPanel = store.xrPanel;

    if (currentPanel === "waitingControllers") {
      if (
        isQuestControllerReady(rightInput) ||
        isQuestControllerReady(leftInput)
      ) {
        store.setXRPanel("onboarding");
      }
    }

    const leftActions = getControllerActions(leftInput);
    const rightActions = getControllerActions(rightInput);

    // Process Left controller UI buttons
    if (leftInput) {
      const xPressed = leftActions.primary;
      const yPressed = leftActions.secondary;
      const leftGripPressed = leftActions.grip;

      if (xPressed && !wasXPressed.current) {
        if (currentPanel === "none") {
          store.setXRPanel("buildMenu");
        } else if (currentPanel === "buildMenu") {
          store.setXRPanel("none");
        } else if (currentPanel === "palette") {
          store.setXRPanel("buildMenu");
        }
      }
      if (yPressed && !wasYPressed.current) {
        if (currentPanel === "none") {
          store.setXRPanel("palette");
        } else if (currentPanel === "palette") {
          store.setXRPanel("none");
        } else if (currentPanel === "buildMenu") {
          store.setXRPanel("palette");
        }
      }

      if (leftGripPressed && !wasRecenterPressed.current) {
        store.triggerVRRecenter();
        triggerHaptics(leftInput, HapticType.UI_CLICK);
      }

      wasXPressed.current = xPressed;
      wasYPressed.current = yPressed;
      // We will update wasRecenterPressed later after checking Right Stick as well
    }

    // Process Right controller UI buttons
    if (rightInput) {
      const bPressed = rightActions.secondary;
      const rightStickClick = rightActions.stick;

      if (rightStickClick && !wasRecenterPressed.current) {
        store.triggerVRRecenter();
        triggerHaptics(rightInput, HapticType.UI_CLICK);
      }
      wasRecenterPressed.current = rightStickClick || leftActions.grip;

      if (bPressed && !wasBPressed.current) {
        let handled = false;
        if (currentPanel !== "none") {
          store.setXRPanel("none");
          handled = true;
        } else if (store.movingBrickId || store.multiSelectedBrickIds.length > 0 || store.activePreset) {
          // Cancel active move, selection, or preset placement and return to neutral Build state
          store.setMode("Build");
          clearGhost();
          handled = true;
        } else if (store.mode !== "Build") {
          store.setMode("Build");
          handled = true;
        }

        if (handled) {
          squeezeMoveBlockedRef.current = false;
          movePreviewActiveRef.current = false;
          triggerHaptics(rightInput, HapticType.UI_CLICK);
        }
      }

      wasBPressed.current = bPressed;
    }

    // Resolve RIGHT controller pose and direction using canonical targetRaySpace
    // This is the single canonical source for all right-hand ray interactions
    let controllerPos = new THREE.Vector3();
    let controllerFwd = new THREE.Vector3(0, 0, -1);
    let controllerQuat = new THREE.Quaternion();
    let hasRightPose = false;

    if (rightInput && referenceSpace && xrFrame) {
      const rayPose = getVRTargetRay(rightInput, xrFrame, referenceSpace, rightController);
      if (rayPose) {
        controllerPos.copy(rayPose.position);
        controllerQuat.copy(rayPose.quaternion);
        controllerFwd.copy(rayPose.direction);
        hasRightPose = true;
      }
    }

    if (hasRightPose && rightInput && rightInput.gamepad) {
      const pos = controllerPos;
      const fwd = controllerFwd;
      
      // Update laser visual immediately if we have a pose
      // Laser matches the canonical ray exactly
      if (laserRef.current) {
        laserRef.current.visible = true;
        laserRef.current.position.copy(pos);
        laserRef.current.quaternion.copy(controllerQuat);
      }
      
      raycaster.set(pos, fwd);

      const targets = vrTargetManager.getValidTargets();

      const intersects = raycaster.intersectObjects(targets, false);

      let hit = null;
      for (const inter of intersects) {
        if (isValidTarget(inter.object)) {
          hit = inter;
          break;
        }
      }

      // Populate or clear canonicalRightHitRef immediately after raycast
      if (hit) {
        const pointWorld = hit.point.clone();
        
        // Calculate world space normal
        const normalWorld = hit.face?.normal
          ? hit.face.normal
              .clone()
              .transformDirection(hit.object.matrixWorld)
              .normalize()
          : new THREE.Vector3(0, 1, 0);

        // Convert point to local space of sceneGroup
        const pointLocal = pointWorld.clone();
        if (sceneGroupRef.current) {
          sceneGroupRef.current.worldToLocal(pointLocal);
        } else {
          pointLocal.divideScalar(currentVRScale);
        }

        let targetKind = "none";
        if (
          hit.object.name === "FloorPlacementCollider" ||
          hit.object.name === "VRFloorCollider" ||
          hit.object.name === "Grid"
        )
          targetKind = "floor";
        else if (Math.abs(normalWorld.y) > 0.7) targetKind = "brick-top";
        else targetKind = "brick-side";

        let isValidPlacement = true;
        if (mode === "Build" && Math.abs(normalWorld.y) < 0.5) {
          isValidPlacement = false;
        }

        canonicalRightHitRef.current = {
          rawHit: hit,
          pointWorld,
          normalWorld,
          pointLocal,
          targetKind,
          isValidPlacement,
          distance: hit.distance,
        };
      } else {
        canonicalRightHitRef.current = null;
      }

      if (isDebugXR) {
        const now = Date.now();
        if (
          !(window as any)._lastVRLaserLogDebug ||
          now - (window as any)._lastVRLaserLogDebug > 1000
        ) {
          (window as any)._lastVRLaserLogDebug = now;
          console.log("[VR] ?debugXR=1", {
            resolvedRightController: rightController?.name || "none",
            laserOriginWorld: pos.toArray().map((v) => v.toFixed(3)),
            controllerWorldPos: pos.toArray().map((v) => v.toFixed(3)),
            rayDirection: fwd.toArray().map((v) => v.toFixed(3)),
            hitTarget: hit?.object?.name || "none",
          });
        }
      }

      let laserDistance = 2.0; // Short length when not hitting anything
      const triggerPressed = rightActions.trigger;
      const squeezePressed = rightActions.grip;
      const aPressed = rightActions.primary;
      const actionPressed = aPressed;

      let isMenuItem = false;
      let onTriggerFn = null;
      let hitMenuLabel = "";

      if (canonicalRightHitRef.current) {
        const canHit = canonicalRightHitRef.current;
        laserDistance = canHit.distance;
        let currentHitObj: THREE.Object3D | null = canHit.rawHit.object;

        while (currentHitObj) {
          if (currentHitObj.userData?.isVRMenuItem) {
            isMenuItem = true;
            onTriggerFn = currentHitObj.userData.onTrigger;
            hitMenuLabel = currentHitObj.userData.label || "";
            break;
          }
          currentHitObj = currentHitObj.parent;
        }

        useLegoStore.getState().setVRMenuHoverContent(hitMenuLabel);

        latestHit.current = {
          hitMenuItem: isMenuItem,
          onTriggerFn,
          hitLoc: canHit.rawHit,
        };

        if (isMenuItem && onTriggerFn) {
          latestValidPlacement.current = null;
          clearGhost();
        } else if (useLegoStore.getState().xrPanel !== "none") {
          latestValidPlacement.current = null;
          clearGhost();
        } else {
          // Normal brick interaction
          const isFrozenPreview =
            mode === "Move" &&
            useLegoStore.getState().isDraggingBrick &&
            movePreviewActiveRef.current &&
            !squeezePressed;

          if (isFrozenPreview) {
            // Keep frozen
          } else {
            latestValidPlacement.current = canHit.isValidPlacement
              ? {
                  p: canHit.pointLocal,
                  n: canHit.normalWorld,
                  tk: canHit.targetKind,
                }
              : null;
            // Always update ghost position if we hit a valid physical target, 
            // so the user sees feedback even if placement is rejected.
            updateGhostPosition(canHit.pointLocal, canHit.normalWorld, canHit.targetKind);
            setHasPlacementCandidate(true);
          }
        } // End of placement calc

        if (triggerPressed && !wasTriggerPressed.current) {
          if (isMenuItem && onTriggerFn) {
            onTriggerFn();
            triggerHaptics(rightInput, HapticType.UI_CLICK);
            audioService.play("select");
          } else if (useLegoStore.getState().xrPanel !== "none") {
            // Do nothing to the world if a panel is open!
          } else if (mode === "Delete") {
            const instId = canHit.rawHit.instanceId;
            const ud = canHit.rawHit.object.userData;
            if (instId !== undefined && ud && ud.bricks) {
              const brickIndex = ud.isStud
                ? Math.floor(instId / (ud.w * ud.d))
                : instId;
              const b = ud.bricks[brickIndex];
              if (b) {
                performVRDelete(b, rightInput);
              }
            }
          } else {
            const state = useLegoStore.getState();
            const canCommitMove =
              mode === "Move" &&
              state.movingBrickId &&
              state.isDraggingBrick &&
              latestValidPlacement.current;
            const canCommitRotationOnly =
              mode === "Move" && state.movingBrickId && !state.isDraggingBrick;
            const canCommitBuild =
              mode === "Build" && latestValidPlacement.current;

            if (canCommitMove || canCommitBuild) {
              requestCommit(
                latestValidPlacement.current!.p,
                latestValidPlacement.current!.n,
                latestValidPlacement.current!.tk,
                rightInput,
              );
            } else if (canCommitRotationOnly) {
              requestCommit(
                new THREE.Vector3(),
                new THREE.Vector3(0, 1, 0),
                "none",
                rightInput,
              );
            } else if (mode === "Move" && !state.movingBrickId) {
              useLegoStore
                .getState()
                .setToastMessage("Select and drag a brick to move it.");
              setTimeout(
                () => useLegoStore.getState().setToastMessage(null),
                3000,
              );
              triggerHaptics(rightInput, HapticType.ERROR);
              audioService.play("error");
            } else {
              useLegoStore
                .getState()
                .setToastMessage("Invalid placement surface.");
              triggerHaptics(rightInput, HapticType.ERROR);
              audioService.play("error");
            }
          }
        }

        // Right grip / middle-finger button deletes the brick targeted by the right-controller reticle
        if (squeezePressed && !wasSqueezePressed.current) {
          if (!isMenuItem && useLegoStore.getState().xrPanel === "none") {
            const instId = canHit.rawHit.instanceId;
            const ud = canHit.rawHit.object.userData;
            if (instId !== undefined && ud && ud.bricks) {
              let brickIndex = ud.isStud
                ? Math.floor(instId / (ud.w * ud.d))
                : instId;
              const b = ud.bricks[brickIndex];
              if (b) {
                performVRDelete(b, rightInput);
              }
            }
          }
        }
      } else {
        // Not aimed at valid target, clear action states without logic
        // if users click trigger, nothing happens.
        useLegoStore.getState().setVRMenuHoverContent("");
        const isFrozenPreview =
          mode === "Move" &&
          useLegoStore.getState().isDraggingBrick &&
          movePreviewActiveRef.current &&
          !squeezePressed;
        if (!isFrozenPreview) {
          clearGhost();
        }
        latestHit.current = null;

        if (triggerPressed && !wasTriggerPressed.current) {
          if (useLegoStore.getState().xrPanel !== "none") {
            // Ignore trigger completely
          } else {
            const state = useLegoStore.getState();
            const canCommitFrozenMove =
              mode === "Move" &&
              state.movingBrickId &&
              state.isDraggingBrick &&
              movePreviewActiveRef.current &&
              latestValidPlacement.current;
            const canCommitRotationOnly =
              mode === "Move" && state.movingBrickId && !state.isDraggingBrick;

            if (canCommitFrozenMove) {
              requestCommit(
                latestValidPlacement.current!.p,
                latestValidPlacement.current!.n,
                latestValidPlacement.current!.tk,
                rightInput,
              );
            } else if (canCommitRotationOnly) {
              requestCommit(
                new THREE.Vector3(),
                new THREE.Vector3(0, 1, 0),
                "none",
                rightInput,
              );
            }
          }
        }
      }

      // Handle A button (independent of ray hit)
      if (actionPressed && !wasActionPressed.current) {
        useLegoStore.getState().triggerRotateGhost();
        triggerHaptics(rightInput, HapticType.ROTATE);
      }

      // Render laser (removed redundant assignment, handled above for responsiveness)
      if (laserRef.current) {
        laserRef.current.scale.set(1, 1, laserDistance);
      }

      // Render hover marker
      if (hoverMarkerRef.current) {
        const canHit = canonicalRightHitRef.current;
        if (
          canHit &&
          (canHit.rawHit.object.name === "Grid" ||
            canHit.rawHit.object.name === "GridHelper" ||
            canHit.rawHit.object.name === "FloorPlacementCollider" ||
            canHit.rawHit.object.name === "VRFloorCollider" ||
            canHit.rawHit.object.name.includes("BrickBody") ||
            canHit.rawHit.object.name.includes("BrickStuds") ||
            canHit.rawHit.object.userData?.isVRPlacementTarget ||
            isMenuItem)
        ) {
          hoverMarkerRef.current.visible = true;
          hoverMarkerRef.current.position.copy(canHit.pointWorld);
          // Nudge marker slightly along normal to avoid Z-fighting
          hoverMarkerRef.current.position.addScaledVector(canHit.normalWorld, 0.001);

          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            canHit.normalWorld,
          );
          hoverMarkerRef.current.quaternion.copy(quaternion);
        } else {
          hoverMarkerRef.current.visible = false;
        }
      }

      // Handle Squeeze (Grip) release for dropping/placing
      if (!squeezePressed && wasSqueezePressed.current) {
        // Deliberately do nothing:
        // Grip release does not commit nor cancel.
        // User must use Right Trigger to confirm, or B to cancel.
      }

      // Always track state
      wasActionPressed.current = actionPressed;
      wasTriggerPressed.current = triggerPressed;
      wasSqueezePressed.current = squeezePressed;

      if (isDebugXR && debugTextRef.current) {
        debugTextRef.current.text = [
          `L-Ctrl: ${!!leftController} | R-Ctrl: ${!!rightController} | R-Obj: ${rightController?.name || "none"}`,
          `R-Stick: ${rightInput?.gamepad?.axes.map(a => a.toFixed(2)).join(",")}`,
          `X:${wasXPressed.current} Y:${wasYPressed.current} A:${actionPressed} B:${wasBPressed.current} Trg:${triggerPressed} Grp:${squeezePressed}`,
          `Hit: ${canonicalRightHitRef.current ? canonicalRightHitRef.current.rawHit.object.name : "none"}`,
          `PlacementValid: ${latestValidPlacement.current ? "yes" : "no"}`,
        ].join("\n");
      }
    } else {
      canonicalRightHitRef.current = null;
      if (laserRef.current) laserRef.current.visible = false;
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false;
      // Clear interactions when tracking lost
      clearGhost();
      latestHit.current = null;
      useLegoStore.getState().setVRMenuHoverContent("");
    }
  });

  return (
    <group>
      <mesh
        ref={laserRef}
        geometry={laserGeo}
        visible={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={hoverMarkerRef} visible={false} raycast={() => null}>
        <ringGeometry args={[0.02, 0.025, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          depthTest={false}
        />
      </mesh>
      {isDebugXR && (
        <group position={[0, 1.5, -1.5]}>
          <Text
            ref={debugTextRef}
            color="chartreuse"
            fontSize={0.05}
            anchorX="center"
            anchorY="middle"
          >
            {" "}
          </Text>
        </group>
      )}
    </group>
  );
};
