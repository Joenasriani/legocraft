import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore, getGroupBricks, hasBrickAbove } from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "../constants";
import { audioService } from "./services/audioService";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";
import { isQuestControllerReady } from "../lib/vrHelpers";
import { createInitialXRControllerState, resolveXRInputSource, getControllerAimRay, isButtonJustPressed, isButtonJustReleased } from "../lib/xrControllerResolver";

import { useXRStore } from "@react-three/xr";

const isDebugXR =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugXR") === "1";


interface VRHitResult {
  aimRay: any;
  intersections: THREE.Intersection[];
  firstHit: THREE.Intersection | null;
  hitObject: THREE.Object3D | null;
  hitDistance: number;
  isValid: boolean;
}

const getCanonicalVRRaycastHit = (
  controllerState: any,
  raycaster: THREE.Raycaster,
  targets: THREE.Object3D[],
  isLeft: boolean,
  isValidTargetFn: (obj: THREE.Object3D, isLeft: boolean) => boolean
): VRHitResult => {
  const aim = getControllerAimRay(controllerState);
  if (!aim.isValid) {
    return {
      aimRay: aim,
      intersections: [],
      firstHit: null,
      hitObject: null,
      hitDistance: 2.0,
      isValid: false
    };
  }

  raycaster.set(aim.origin, aim.direction);
  const intersections = raycaster.intersectObjects(targets, false);

  let hit = null;
  for (const inter of intersections) {
    if (isValidTargetFn(inter.object, isLeft)) {
      hit = inter;
      break;
    }
  }

  return {
    aimRay: aim,
    intersections,
    firstHit: hit,
    hitObject: hit ? hit.object : null,
    hitDistance: hit ? hit.distance : 2.0,
    isValid: !!hit
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
  
  const leftControllerStateRef = useRef(createInitialXRControllerState("left"));
  const rightControllerStateRef = useRef(createInitialXRControllerState("right"));

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

  const squeezeStartPosRef = useRef<THREE.Vector3 | null>(null);
  const squeezeMoveBlockedRef = useRef(false);
  const movePreviewActiveRef = useRef(false);
  const snapTurnCooldown = useRef(false);
  const menuClickActiveRef = useRef(false);

  const isValidTarget = (obj: THREE.Object3D, isLeft: boolean) => {
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

    const xrPanel = useLegoStore.getState().xrPanel;

    if (xrPanel === "onboarding" || xrPanel === "waitingControllers" || xrPanel === "error") {
      return false;
    }

    if (isLeft) {
      return isMenu && (xrPanel === "buildMenu" || xrPanel === "palette");
    } else {
      return !isMenu;
    }
  };

  const laserRef = useRef<THREE.Mesh>(null);
  const hoverMarkerRef = useRef<THREE.Mesh>(null);
  const leftLaserRef = useRef<THREE.Mesh>(null);
  const leftHoverMarkerRef = useRef<THREE.Mesh>(null);

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

  const rightGripHoldStartRef = useRef<number | null>(null);
  const rightGripHoldTargetRef = useRef<any>(null);
  const rightGripDeletedRef = useRef<boolean>(false);
  const rightGripWarnedRef = useRef<boolean>(false);

  const canonicalRightHitRef = useRef<{
    rawHit: any;
    pointWorld: THREE.Vector3;
    normalWorld: THREE.Vector3;
    pointLocal: THREE.Vector3;
    targetKind: string;
    isValidPlacement: boolean;
    distance: number;
  } | null>(null);

  const canonicalLeftHitRef = useRef<{
    rawHit: any;
    pointWorld: THREE.Vector3;
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
      store.setIsDraggingBrick(true);
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
        store.setIsDraggingBrick(true);
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
        store.setIsDraggingBrick(true);
      }
    } else {
      const isBlocked = hasBrickAbove(brick, allBricks, MODULE_SIZE, BRICK_HEIGHT);
      store.setMovingBrickId(brick.id);
      store.setIsDraggingBrick(true);
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

    // Phase 2: Resolve canonical state but preserve existing refs to not break logic yet
    resolveXRInputSource(
      leftInput,
      leftController,
      undefined,
      leftControllerStateRef.current,
      xrFrameArg as XRFrame,
      referenceSpace
    );
    resolveXRInputSource(
      rightInput,
      rightController,
      undefined,
      rightControllerStateRef.current,
      xrFrameArg as XRFrame,
      referenceSpace
    );

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

    // Process Left controller UI buttons
    if (leftInput) {
      const xJustPressed = isButtonJustPressed(leftControllerStateRef.current, "xButton") || isButtonJustPressed(leftControllerStateRef.current, "primary");
      const yJustPressed = isButtonJustPressed(leftControllerStateRef.current, "yButton") || isButtonJustPressed(leftControllerStateRef.current, "secondary");

      if (xJustPressed) {
        rightGripHoldStartRef.current = null;
        if (currentPanel === "none") {
          store.setXRPanel("buildMenu");
        } else if (currentPanel === "buildMenu") {
          store.setXRPanel("none");
        } else if (currentPanel === "palette") {
          store.setXRPanel("buildMenu");
        }
      }
      if (yJustPressed) {
        rightGripHoldStartRef.current = null;
        if (currentPanel === "none") {
          store.setXRPanel("palette");
        } else if (currentPanel === "palette") {
          store.setXRPanel("none");
        } else if (currentPanel === "buildMenu") {
          store.setXRPanel("palette");
        }
      }
    }

    // Process Right controller UI buttons
    if (rightInput) {
      const bJustPressed = isButtonJustPressed(rightControllerStateRef.current, "bButton") || isButtonJustPressed(rightControllerStateRef.current, "secondary");

      if (bJustPressed) {
        rightGripHoldStartRef.current = null;
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
    }

    // Resolve RIGHT controller pose and direction using canonical aim ray
    // This is the single canonical source for all right-hand ray interactions
    let controllerPos = new THREE.Vector3();
    let controllerFwd = new THREE.Vector3(0, 0, -1);
    let hasRightPose = false;

    const rightAim = getControllerAimRay(rightControllerStateRef.current);
    if (rightInput && rightAim.isValid) {
      controllerPos.copy(rightAim.origin);
      controllerFwd.copy(rightAim.direction);
      hasRightPose = true;
    }

    // Resolve LEFT controller pose and direction using canonical aim ray
    let leftControllerPos = new THREE.Vector3();
    let leftControllerFwd = new THREE.Vector3(0, 0, -1);
    let hasLeftPose = false;

    const leftAim = getControllerAimRay(leftControllerStateRef.current);
    if (leftInput && leftAim.isValid) {
      leftControllerPos.copy(leftAim.origin);
      leftControllerFwd.copy(leftAim.direction);
      hasLeftPose = true;
    }

    if (hasLeftPose && leftInput) {
      const isLeftMenuOpen = currentPanel === "buildMenu" || currentPanel === "palette";
      const targets = vrTargetManager.getValidTargets();
      const leftAim = getControllerAimRay(leftControllerStateRef.current);
      const leftHitInfo = getCanonicalVRRaycastHit(leftControllerStateRef.current, raycaster, targets, true, isValidTarget);

      if (leftLaserRef.current) {
        if (leftAim.isValid && isLeftMenuOpen) {
          leftLaserRef.current.visible = true;
          leftLaserRef.current.position.copy(leftAim.origin);
          leftLaserRef.current.lookAt(leftAim.origin.clone().add(leftAim.direction));
        } else {
          leftLaserRef.current.visible = false;
        }
      }

      if (leftHitInfo.isValid && leftHitInfo.firstHit) {
        canonicalLeftHitRef.current = {
          rawHit: leftHitInfo.firstHit,
          pointWorld: leftHitInfo.firstHit.point.clone(),
          distance: leftHitInfo.hitDistance,
        };
      } else {
        canonicalLeftHitRef.current = null;
      }

      let laserDistance = 2.0;

      let isLeftMenuItem = false;
      let leftOnTriggerFn = null;
      let leftHitMenuLabel = "";

      if (canonicalLeftHitRef.current) {
        const canHit = canonicalLeftHitRef.current;
        laserDistance = canHit.distance;
        let currentHitObj: THREE.Object3D | null = canHit.rawHit.object;

        while (currentHitObj) {
          if (currentHitObj.userData?.isVRMenuItem) {
            isLeftMenuItem = true;
            leftOnTriggerFn = currentHitObj.userData.onTrigger;
            leftHitMenuLabel = currentHitObj.userData.label || "";
            break;
          }
          currentHitObj = currentHitObj.parent;
        }

        if (leftHitMenuLabel) {
          useLegoStore.getState().setVRMenuHoverContent(leftHitMenuLabel);
        }
      }

      if (isButtonJustPressed(leftControllerStateRef.current, "trigger")) {
        if (isLeftMenuItem && leftOnTriggerFn) {
          leftOnTriggerFn();
          triggerHaptics(leftInput, HapticType.UI_CLICK);
          audioService.play("select");
        }
      }

      if (leftLaserRef.current) {
        leftLaserRef.current.scale.set(1, 1, laserDistance);
      }

      if (leftHoverMarkerRef.current) {
        const canHit = canonicalLeftHitRef.current;
        if (canHit && isLeftMenuItem) {
          leftHoverMarkerRef.current.visible = true;
          leftHoverMarkerRef.current.position.copy(canHit.pointWorld);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            canHit.rawHit.face?.normal?.clone().transformDirection(canHit.rawHit.object.matrixWorld).normalize() || new THREE.Vector3(0,1,0)
          );
          leftHoverMarkerRef.current.quaternion.copy(quaternion);
        } else {
          leftHoverMarkerRef.current.visible = false;
        }
      }
    } else {
      canonicalLeftHitRef.current = null;
      if (leftLaserRef.current) leftLaserRef.current.visible = false;
      if (leftHoverMarkerRef.current) leftHoverMarkerRef.current.visible = false;
    }

    if (hasRightPose && rightInput) {
      const targets = vrTargetManager.getValidTargets();
      const rightAim = getControllerAimRay(rightControllerStateRef.current);
      const rightHitInfo = getCanonicalVRRaycastHit(rightControllerStateRef.current, raycaster, targets, false, isValidTarget);
      
      // Update laser visual immediately if we have a pose
      if (laserRef.current) {
        if (rightAim.isValid && currentPanel !== "onboarding") { // Keep general visibility logic
          laserRef.current.visible = true;
          laserRef.current.position.copy(rightAim.origin);
          laserRef.current.lookAt(rightAim.origin.clone().add(rightAim.direction));
        } else {
          laserRef.current.visible = false;
        }
      }
      
      // Populate or clear canonicalRightHitRef immediately after raycast
      if (rightHitInfo.isValid && rightHitInfo.firstHit) {
        const hit = rightHitInfo.firstHit;
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
        else if (normalWorld.y > 0.7) targetKind = "brick-top";
        else if (normalWorld.y < -0.7) targetKind = "brick-bottom";
        else targetKind = "brick-side";

        let isValidPlacement = true;
        if (mode === "Build" && Math.abs(normalWorld.y) < 0.5) {
          isValidPlacement = false;
        }
        if (targetKind === "brick-bottom") {
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
            laserOriginWorld: controllerPos.toArray().map((v: number) => v.toFixed(3)),
            controllerWorldPos: controllerPos.toArray().map((v: number) => v.toFixed(3)),
            rayDirection: controllerFwd.toArray().map((v: number) => v.toFixed(3)),
            hitTarget: rightHitInfo.firstHit?.object?.name || "none",
          });
        }
      }

      let laserDistance = 2.0; // Short length when not hitting anything
      const squeezePressed = rightControllerStateRef.current.buttonsCurrent.grip;

      // ---- NEW RIGHT GRIP LOGIC ----
      let currentHoverBrick: any = null;
      if (canonicalRightHitRef.current && useLegoStore.getState().xrPanel === "none") {
        const canHit = canonicalRightHitRef.current;
        const instId = canHit.rawHit.instanceId;
        const ud = canHit.rawHit.object.userData;
        if (instId !== undefined && ud && ud.bricks) {
          const brickIndex = ud.isStud ? Math.floor(instId / (ud.w * ud.d)) : instId;
          currentHoverBrick = ud.bricks[brickIndex] || null;
        }
      }

      const justGrip = isButtonJustPressed(rightControllerStateRef.current, "grip");
      
      if (justGrip) {
        if (currentHoverBrick && useLegoStore.getState().xrPanel === "none") {
          rightGripHoldStartRef.current = performance.now();
          rightGripHoldTargetRef.current = currentHoverBrick;
          rightGripDeletedRef.current = false;
          rightGripWarnedRef.current = false;
        }
      }

      if (squeezePressed && rightGripHoldStartRef.current !== null) {
        if (!currentHoverBrick || currentHoverBrick.id !== rightGripHoldTargetRef.current?.id) {
          rightGripHoldStartRef.current = null;
          if (useLegoStore.getState().xrPanel === "none") {
            useLegoStore.getState().setVRMenuHoverContent(""); 
          }
        } else {
          const holdTime = performance.now() - rightGripHoldStartRef.current;
          if (!rightGripDeletedRef.current) {
            if (holdTime > 200 && holdTime < 600) {
              if (useLegoStore.getState().xrPanel === "none" && !useLegoStore.getState().isDraggingBrick) {
                useLegoStore.getState().setVRMenuHoverContent("Hold to Delete");
              }
              if (!rightGripWarnedRef.current && holdTime > 250) {
                triggerHaptics(rightInput, HapticType.UI_HOVER); 
                rightGripWarnedRef.current = true;
              }
            }
            if (holdTime >= 600) {
              performVRDelete(rightGripHoldTargetRef.current, rightInput);
              rightGripDeletedRef.current = true;
              if (useLegoStore.getState().xrPanel === "none") {
                useLegoStore.getState().setVRMenuHoverContent("");
              }
            }
          }
        }
      }

      if (isButtonJustReleased(rightControllerStateRef.current, "grip")) {
        if (rightGripHoldStartRef.current !== null) {
          const holdTime = performance.now() - rightGripHoldStartRef.current;
          if (!rightGripDeletedRef.current && holdTime < 600) {
             if (useLegoStore.getState().mode !== "Move") {
                useLegoStore.getState().setMode("Move");
             }
             if (rightGripHoldTargetRef.current) {
                performVRSelection(rightGripHoldTargetRef.current, rightInput, controllerPos);
             }
          }
          rightGripHoldStartRef.current = null;
          rightGripHoldTargetRef.current = null;
          if (useLegoStore.getState().xrPanel === "none") {
             useLegoStore.getState().setVRMenuHoverContent("");
          }
        }
      }
      // ---- END RIGHT GRIP LOGIC ----

      if (canonicalRightHitRef.current) {
        const canHit = canonicalRightHitRef.current;
        laserDistance = canHit.distance;

        let currentHitObj: THREE.Object3D | null = canHit.rawHit.object;
        let isRightMenuItem = false;
        let rightOnTriggerFn: any = null;
        let rightHitMenuLabel = "";

        while (currentHitObj) {
          if (currentHitObj.userData?.isVRMenuItem) {
            isRightMenuItem = true;
            rightOnTriggerFn = currentHitObj.userData.onTrigger;
            rightHitMenuLabel = currentHitObj.userData.label || "";
            break;
          }
          currentHitObj = currentHitObj.parent;
        }

        if (rightHitMenuLabel) {
          useLegoStore.getState().setVRMenuHoverContent(rightHitMenuLabel);
        }

        latestHit.current = {
          hitMenuItem: isRightMenuItem,
          onTriggerFn: rightOnTriggerFn,
          hitLoc: canHit.rawHit,
        };

        if (useLegoStore.getState().xrPanel !== "none") {
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

        if (isButtonJustPressed(rightControllerStateRef.current, "trigger")) {
          if (useLegoStore.getState().xrPanel !== "none") {
            // Do nothing to the world if a panel is open!
            if (isRightMenuItem && rightOnTriggerFn) {
              rightOnTriggerFn();
              triggerHaptics(rightInput, HapticType.UI_CLICK);
              audioService.play("select");
            }
          } else if (mode === "Delete") {
            useLegoStore.getState().setToastMessage("Use Right Grip to delete.");
            setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
            triggerHaptics(rightInput, HapticType.ERROR);
            audioService.play("error");
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
                .setToastMessage("Use Right Grip to select a brick.");
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

        if (isButtonJustPressed(rightControllerStateRef.current, "trigger")) {
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
      if (isButtonJustPressed(rightControllerStateRef.current, "aButton") || isButtonJustPressed(rightControllerStateRef.current, "primary")) {
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
            canHit.rawHit.object.userData?.isVRPlacementTarget)
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

      // Handle Squeeze (Grip) state tracking handled above in Right Grip Logic
      // Handled natively by xrControllerResolver buttonsPrevious

      if (isDebugXR && debugTextRef.current) {
        debugTextRef.current.text = [
          `L-Ctrl: ${!!leftController} | R-Ctrl: ${!!rightController} | R-Obj: ${rightController?.name || "none"}`,
          `R-Stick: ${rightInput?.gamepad?.axes.map(a => a.toFixed(2)).join(",")}`,
          `X:${leftControllerStateRef.current.buttonsCurrent.xButton} Y:${leftControllerStateRef.current.buttonsCurrent.yButton} A:${rightControllerStateRef.current.buttonsCurrent.aButton} B:${rightControllerStateRef.current.buttonsCurrent.bButton} Trg:${rightControllerStateRef.current.buttonsCurrent.trigger} Grp:${rightControllerStateRef.current.buttonsCurrent.grip}`,
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
        ref={leftLaserRef}
        geometry={laserGeo}
        visible={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={leftHoverMarkerRef} visible={false} raycast={() => null}>
        <ringGeometry args={[0.02, 0.025, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          depthTest={false}
        />
      </mesh>
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
