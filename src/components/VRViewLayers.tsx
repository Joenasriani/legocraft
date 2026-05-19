import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore, getGroupBricks, hasBrickAbove } from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "../constants";
import { audioService } from "../services/audioService";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";
import { isQuestControllerReady } from "../lib/vrHelpers";

import { useXRStore } from "@react-three/xr";

const isDebugXR =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugXR") === "1";

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
  const latestMenuItem = useRef<any>(null);
  const latestInput = useRef<any>(null);

  const latestValidPlacement = useRef<{
    p: THREE.Vector3;
    n: THREE.Vector3;
    tk: string;
  } | null>(null);

  const debugTextRef = useRef<any>(null);

  useFrame((state, delta, xrFrame) => {
    const xrState = xrStore.getState();
    const session = xrState.session;
    if (!session || !sceneGroupRef.current) return;

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

    // Process Left controller UI buttons
    if (leftInput && leftInput.gamepad) {
      const gp = leftInput.gamepad;
      const xPressed = gp.buttons[4]?.pressed || false;
      const yPressed = gp.buttons[5]?.pressed || false;
      const leftGripPressed = gp.buttons[1]?.pressed || false;

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
    if (rightInput && rightInput.gamepad) {
      const gp = rightInput.gamepad;
      // B button is 5 on right controller, or 4 for some old Oculus mapping
      const bPressed = gp.buttons[5]?.pressed || false;
      const rightStickClick = gp.buttons[3]?.pressed || gp.buttons[10]?.pressed || false;

      if (rightStickClick && !wasRecenterPressed.current) {
        store.triggerVRRecenter();
        triggerHaptics(rightInput, HapticType.UI_CLICK);
      }
      wasRecenterPressed.current = rightStickClick || (leftInput?.gamepad?.buttons[1]?.pressed || false);

      if (bPressed && !wasBPressed.current) {
        let handled = false;
        if (currentPanel !== "none") {
          store.setXRPanel("none");
          handled = true;
        } else if (store.mode === "Move" && store.movingBrickId) {
          const targetBrickId = store.movingBrickId;
          const targetBrick = store.bricks.find((b) => b.id === targetBrickId);
          
          if (targetBrick) {
            if (store.selectionMode === "Group") {
              const g = getGroupBricks(targetBrick, store.bricks);
              store.removeBricks(g.map((bz) => bz.id));
            } else if (store.selectionMode === "Multi") {
              store.removeBricks(store.multiSelectedBrickIds);
            } else {
              store.removeBrick(targetBrickId);
            }
          }
          
          store.setMovingBrickId(null);
          store.setIsDraggingBrick(false);
          store.setMode("Build");
          updateGhostPosition(
            new THREE.Vector3(0, -1000, 0),
            new THREE.Vector3(0, 1, 0),
            "none",
          );
          triggerHaptics(rightInput, HapticType.BRICK_DELETE);
          audioService.play("remove");
          handled = true;
        } else if (store.mode !== "Build") {
          store.setMode("Build");
          handled = true;
        }

        if (handled) {
          squeezeMoveBlockedRef.current = false;
          movePreviewActiveRef.current = false;
        }
      }

      wasBPressed.current = bPressed;
    }

    // Resolve RIGHT controller pose and direction
    let controllerPos = new THREE.Vector3();
    let controllerFwd = new THREE.Vector3(0, 0, -1);
    let controllerQuat = new THREE.Quaternion();
    let hasRightPose = false;

    if (rightController) {
      // Canonical resolver: Use the world matrix of the XR Controller object.
      // In @react-three/xr, this object represents the targetRaySpace.
      // We ensure the matrix is up to date since we are using it in useFrame.
      rightController.updateMatrixWorld(true);
      controllerPos.setFromMatrixPosition(rightController.matrixWorld);
      controllerQuat.setFromRotationMatrix(rightController.matrixWorld);
      controllerFwd
        .set(0, 0, -1)
        .transformDirection(rightController.matrixWorld)
        .normalize();
      hasRightPose = true;
    }

    if (hasRightPose && rightInput && rightInput.gamepad) {
      const pos = controllerPos;
      const fwd = controllerFwd;
      
      // Update laser visual immediately if we have a pose
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
      const gp = rightInput.gamepad;
      const triggerPressed = gp.buttons[0]?.pressed || false;
      const squeezePressed = gp.buttons[1]?.pressed || false;
      // right A = 4 (or 3 fallback for some profiles)
      const aPressed =
        gp.buttons[4]?.pressed || gp.buttons[3]?.pressed || false;
      const actionPressed = aPressed;

      let isMenuItem = false;
      let onTriggerFn = null;
      let hitMenuLabel = "";

      if (hit) {
        laserDistance = hit.distance;
        let currentHitObj: THREE.Object3D | null = hit.object;

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
          hitLoc: hit,
        };

        if (isMenuItem && onTriggerFn) {
          latestValidPlacement.current = null;
          updateGhostPosition(
            new THREE.Vector3(0, -1000, 0),
            new THREE.Vector3(0, 1, 0),
            "none",
          );
        } else if (useLegoStore.getState().xrPanel !== "none") {
          latestValidPlacement.current = null;
          updateGhostPosition(
            new THREE.Vector3(0, -1000, 0),
            new THREE.Vector3(0, 1, 0),
            "none",
          );
        } else {
          // Normal brick interaction
          const pointLocal = hit.point.clone();
          if (sceneGroupRef.current) {
            sceneGroupRef.current.worldToLocal(pointLocal);
          } else {
            pointLocal.divideScalar(currentVRScale);
          }

          const normal = hit.face?.normal
            ? hit.face.normal
                .clone()
                .transformDirection(hit.object.matrixWorld)
                .normalize()
            : new THREE.Vector3(0, 1, 0);

          let isValidPlacement = true;
          let rejectReason = "";
          // Reject side placement for Build mode
          if (mode === "Build" && Math.abs(normal.y) < 0.5) {
            isValidPlacement = false;
            rejectReason = "Side placement blocked in Build mode";
          }

          let targetKind = "none";
          if (
            hit.object.name === "FloorPlacementCollider" ||
            hit.object.name === "VRFloorCollider" ||
            hit.object.name === "Grid"
          )
            targetKind = "floor";
          else if (Math.abs(normal.y) > 0.7) targetKind = "brick-top";
          else targetKind = "brick-side";

          const isFrozenPreview =
            mode === "Move" &&
            useLegoStore.getState().isDraggingBrick &&
            movePreviewActiveRef.current &&
            !squeezePressed;

          if (isFrozenPreview) {
            // Keep frozen
          } else {
            latestValidPlacement.current = isValidPlacement
              ? {
                  p: pointLocal,
                  n: normal,
                  tk: targetKind,
                }
              : null;
            // Always update ghost position if we hit a valid physical target, 
            // so the user sees feedback even if placement is rejected.
            updateGhostPosition(pointLocal, normal, targetKind);
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
          } else if (mode === "Delete" && hit) {
            const instId = hit.instanceId;
            const ud = hit.object.userData;
            if (instId !== undefined && ud && ud.bricks) {
              const brickIndex = ud.isStud
                ? Math.floor(instId / (ud.w * ud.d))
                : instId;
              const b = ud.bricks[brickIndex];
              if (b) {
                if (selectionMode === "Group") {
                  const allb = useLegoStore.getState().bricks;
                  const g = getGroupBricks(b, allb);
                  removeBricks(g.map((bz: any) => bz.id));
                } else if (selectionMode === "Multi") {
                  const multiIds = useLegoStore.getState().multiSelectedBrickIds;
                  const isPart = multiIds.includes(b.id);
                  const idsToDelete = isPart ? multiIds : [b.id];

                  const allb = useLegoStore.getState().bricks;
                  const isBlocked = idsToDelete.some((id) => {
                    const br = allb.find((bk) => bk.id === id);
                    return (
                      br &&
                      hasBrickAbove(
                        br,
                        allb,
                        MODULE_SIZE,
                        BRICK_HEIGHT,
                        idsToDelete,
                      )
                    );
                  });

                  if (isBlocked) {
                    useLegoStore
                      .getState()
                      .setToastMessage(
                        idsToDelete.length > 1
                          ? "Cannot delete selection: blocked by other bricks."
                          : "Cannot delete: brick has another brick above it.",
                      );
                    setTimeout(
                      () => useLegoStore.getState().setToastMessage(null),
                      3000,
                    );
                    triggerHaptics(rightInput, HapticType.ERROR);
                    audioService.play("error");
                  } else {
                    useLegoStore.getState().removeBricks(idsToDelete);
                    if (isPart) {
                      useLegoStore.getState().setMultiSelectedBrickIds([]);
                    }
                    triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                    audioService.play("remove");
                  }
                } else {
                  removeBrick(b.id);
                  triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                  audioService.play("remove");
                }
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
              const success = handleVRCommit(
                latestValidPlacement.current!.p,
                latestValidPlacement.current!.n,
                latestValidPlacement.current!.tk,
              );
              if (success) {
                triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                audioService.play("place");
                movePreviewActiveRef.current = false;
              } else {
                triggerHaptics(rightInput, HapticType.ERROR);
                audioService.play("error");
              }
            } else if (canCommitRotationOnly) {
              const success = handleVRCommit(
                new THREE.Vector3(),
                new THREE.Vector3(0, 1, 0),
                "none",
              );
              if (success) {
                triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                audioService.play("place");
                movePreviewActiveRef.current = false;
              } else {
                triggerHaptics(rightInput, HapticType.ERROR);
                audioService.play("error");
              }
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

        if (squeezePressed && wasSqueezePressed.current) {
          if (
            useLegoStore.getState().mode === "Move" &&
            movingBrickId &&
            squeezeStartPosRef.current &&
            !useLegoStore.getState().isDraggingBrick &&
            !squeezeMoveBlockedRef.current
          ) {
            const dist = pos.distanceTo(squeezeStartPosRef.current);
            if (dist > 0.05) {
              useLegoStore.getState().setIsDraggingBrick(true);
              movePreviewActiveRef.current = true;
            }
          }
        }

        if (squeezePressed && !wasSqueezePressed.current) {
          if (mode === "Build") {
            useLegoStore.getState().setMode("Move");
          }
          const currentMode = useLegoStore.getState().mode;
          if (currentMode === "Delete" || currentMode === "Move") {
            const instId = hit.instanceId;
            const ud = hit.object.userData;
            if (instId !== undefined && ud && ud.bricks) {
              let brickIndex = instId;
              if (ud.isStud) {
                brickIndex = Math.floor(instId / (ud.w * ud.d));
              }
              const b = ud.bricks[brickIndex];
              if (b) {
                if (currentMode === "Delete") {
                  if (selectionMode === "Group") {
                    const allb = useLegoStore.getState().bricks;
                    const g = getGroupBricks(b, allb);
                    const gIds = g.map((bz: any) => bz.id);
                    if (
                      g.some((bz: any) =>
                        hasBrickAbove(
                          bz,
                          allb,
                          MODULE_SIZE,
                          BRICK_HEIGHT,
                          gIds,
                        ),
                      )
                    ) {
                      useLegoStore
                        .getState()
                        .setToastMessage(
                          "Cannot delete: selection is blocked by other bricks on top.",
                        );
                      setTimeout(
                        () => useLegoStore.getState().setToastMessage(null),
                        3000,
                      );
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.play("error");
                    } else {
                      removeBricks(gIds);
                      triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                      audioService.play("remove");
                    }
                  } else if (selectionMode === "Multi") {
                    const multiIds =
                      useLegoStore.getState().multiSelectedBrickIds;
                    const isPart = multiIds.includes(b.id);
                    const idsToDelete = isPart ? multiIds : [b.id];

                    const allb = useLegoStore.getState().bricks;
                    const isBlocked = idsToDelete.some((id) => {
                      const br = allb.find((bk) => bk.id === id);
                      return (
                        br &&
                        hasBrickAbove(
                          br,
                          allb,
                          MODULE_SIZE,
                          BRICK_HEIGHT,
                          idsToDelete,
                        )
                      );
                    });

                    if (isBlocked) {
                      useLegoStore
                        .getState()
                        .setToastMessage(
                          idsToDelete.length > 1
                            ? "Cannot delete selection: blocked by other bricks."
                            : "Cannot delete: brick has another brick above it.",
                        );
                      setTimeout(
                        () => useLegoStore.getState().setToastMessage(null),
                        3000,
                      );
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.play("error");
                    } else {
                      useLegoStore.getState().removeBricks(idsToDelete);
                      if (isPart) {
                        useLegoStore.getState().setMultiSelectedBrickIds([]);
                      }
                      triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                      audioService.play("remove");
                    }
                  } else {
                    if (
                      hasBrickAbove(
                        b,
                        useLegoStore.getState().bricks,
                        MODULE_SIZE,
                        BRICK_HEIGHT,
                      )
                    ) {
                      useLegoStore
                        .getState()
                        .setToastMessage(
                          "Cannot delete: brick has another brick above it.",
                        );
                      setTimeout(
                        () => useLegoStore.getState().setToastMessage(null),
                        3000,
                      );
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.play("error");
                    } else {
                      removeBrick(b.id);
                      triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                      audioService.play("remove");
                    }
                  }
                } else if (currentMode === "Move" && !movingBrickId) {
                  if (selectionMode === "Group") {
                    setMovingBrickId(b.id);
                    const allb = useLegoStore.getState().bricks;
                    const g = getGroupBricks(b, allb);
                    const gIds = g.map((bz: any) => bz.id);
                    const isBlocked = g.some((bz: any) =>
                      hasBrickAbove(bz, allb, MODULE_SIZE, BRICK_HEIGHT, gIds),
                    );

                    setIsDraggingBrick(false);
                    squeezeMoveBlockedRef.current = isBlocked;
                    movePreviewActiveRef.current = false;
                    squeezeStartPosRef.current = pos.clone();

                    if (isBlocked) {
                      useLegoStore
                        .getState()
                        .setToastMessage(
                          "Cannot move: selection is blocked by other bricks on top.",
                        );
                      setTimeout(
                        () => useLegoStore.getState().setToastMessage(null),
                        3000,
                      );
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.play("error");
                    }

                    setJustSelectedBrick(true);
                    triggerHaptics(rightInput, HapticType.BRICK_SELECT);
                    audioService.play("select");
                    useLegoStore.getState().triggerSetGhostRotation(b.rotation);
                  } else if (selectionMode === "Multi") {
                    const stateBefore = useLegoStore.getState();
                    stateBefore.toggleMultiSelectBrickId(b.id);
                    const stateAfter = useLegoStore.getState();
                    const isNowSelected =
                      stateAfter.multiSelectedBrickIds.includes(b.id);

                    if (isNowSelected) {
                      setMovingBrickId(b.id);
                      const isBlocked = stateAfter.multiSelectedBrickIds.some(
                        (id) => {
                          const br = stateAfter.bricks.find(
                            (bk) => bk.id === id,
                          );
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
                        },
                      );
                      setIsDraggingBrick(false);
                      squeezeMoveBlockedRef.current = isBlocked;
                      movePreviewActiveRef.current = false;
                      squeezeStartPosRef.current = pos.clone();

                      if (isBlocked) {
                        useLegoStore
                          .getState()
                          .setToastMessage(
                            "Cannot move: selection is blocked by other bricks on top.",
                          );
                        setTimeout(
                          () => useLegoStore.getState().setToastMessage(null),
                          3000,
                        );
                        triggerHaptics(rightInput, HapticType.ERROR);
                        audioService.play("error");
                      }
                    } else if (stateBefore.movingBrickId === b.id) {
                      const newAnchorId =
                        stateAfter.multiSelectedBrickIds[
                          stateAfter.multiSelectedBrickIds.length - 1
                        ];
                      setMovingBrickId(newAnchorId || null);
                      squeezeMoveBlockedRef.current = false;
                      movePreviewActiveRef.current = false;
                      if (newAnchorId) {
                        setIsDraggingBrick(false);
                      } else {
                        setIsDraggingBrick(false);
                      }
                    }
                    setJustSelectedBrick(true);
                    triggerHaptics(rightInput, HapticType.BRICK_SELECT);
                    audioService.play("select");
                    useLegoStore.getState().triggerSetGhostRotation(b.rotation);
                  } else {
                    setMovingBrickId(b.id);
                    const blocks = useLegoStore.getState().bricks;
                    const isBlocked = hasBrickAbove(
                      b,
                      blocks,
                      MODULE_SIZE,
                      BRICK_HEIGHT,
                    );
                    setIsDraggingBrick(false);
                    squeezeMoveBlockedRef.current = isBlocked;
                    movePreviewActiveRef.current = false;
                    squeezeStartPosRef.current = pos.clone();

                    if (isBlocked) {
                      useLegoStore
                        .getState()
                        .setToastMessage(
                          "Cannot move: selection is blocked by other bricks on top.",
                        );
                      setTimeout(
                        () => useLegoStore.getState().setToastMessage(null),
                        3000,
                      );
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.play("error");
                    }
                    setJustSelectedBrick(true);
                    triggerHaptics(rightInput, HapticType.BRICK_SELECT);
                    audioService.play("select");
                    useLegoStore.getState().triggerSetGhostRotation(b.rotation);
                  }
                }
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
          updateGhostPosition(
            new THREE.Vector3(0, -1000, 0),
            new THREE.Vector3(0, 1, 0),
            "none",
          );
          latestValidPlacement.current = null;
          setHasPlacementCandidate(false);
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
              const success = handleVRCommit(
                latestValidPlacement.current!.p,
                latestValidPlacement.current!.n,
                latestValidPlacement.current!.tk,
              );
              if (success) {
                triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                audioService.play("place");
                movePreviewActiveRef.current = false;
              } else {
                triggerHaptics(rightInput, HapticType.ERROR);
                audioService.play("error");
              }
            } else if (canCommitRotationOnly) {
              const success = handleVRCommit(
                new THREE.Vector3(),
                new THREE.Vector3(0, 1, 0),
                "none",
              );
              if (success) {
                triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                audioService.play("place");
                movePreviewActiveRef.current = false;
              } else {
                triggerHaptics(rightInput, HapticType.ERROR);
                audioService.play("error");
              }
            }
          }
        }
      }

      // Handle A button (independent of ray hit)
      if (actionPressed && !wasActionPressed.current) {
        if (mode === "Build" || (mode === "Move" && movingBrickId)) {
          useLegoStore.getState().triggerRotateGhost();
          triggerHaptics(rightInput, HapticType.ROTATE);
        }
      }

      // Render laser (removed redundant assignment, handled above for responsiveness)
      if (laserRef.current) {
        laserRef.current.scale.set(1, 1, laserDistance);
      }

      // Render hover marker
      if (hoverMarkerRef.current) {
        if (
          hit &&
          (hit.object.name === "Grid" ||
            hit.object.name === "GridHelper" ||
            hit.object.name === "FloorPlacementCollider" ||
            hit.object.name === "VRFloorCollider" ||
            hit.object.name.includes("BrickBody") ||
            hit.object.name.includes("BrickStuds") ||
            hit.object.userData?.isVRPlacementTarget ||
            isMenuItem)
        ) {
          hoverMarkerRef.current.visible = true;
          hoverMarkerRef.current.position.copy(hit.point);
          // Nudge marker slightly along normal to avoid Z-fighting
          const normal = hit.face?.normal
            ? hit.face.normal
                .clone()
                .transformDirection(hit.object.matrixWorld)
                .normalize()
            : new THREE.Vector3(0, 1, 0);

          hoverMarkerRef.current.position.addScaledVector(normal, 0.001);

          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            normal,
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
          `Hit: ${hit ? hit.object.name : "none"}`,
          `PlacementValid: ${latestValidPlacement.current ? "yes" : "no"}`,
        ].join("\n");
      }
    } else {
      if (laserRef.current) laserRef.current.visible = false;
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false;
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
