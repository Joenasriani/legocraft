import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLegoStore, getGroupBricks, hasBrickAbove } from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "../constants";
import { audioService } from "../services/AudioService";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";

const isDebugXR = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugXR") === "1";

export const HumanViewLayer = ({
  currentVRScale,
  sceneGroupRef,
  updateGhostPosition,
  handleVRCommit,
}: {
  currentVRScale: number;
  sceneGroupRef: React.RefObject<THREE.Group>;
  updateGhostPosition: (
    p: THREE.Vector3,
    n: THREE.Vector3,
    tk?: string,
  ) => void;
  handleVRCommit: (
    p: THREE.Vector3,
    n: THREE.Vector3,
    tk: string,
  ) => boolean;
}) => {
  const { gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster()).current;

  useEffect(() => {
    const session = gl.xr.getSession();
    if (!session) return;

    const attachHandedness = (event: any) => {
      if (event.target && event.data) {
        event.target.userData.handedness = event.data.handedness;
        event.target.userData.inputSource = event.data;
      }
    };

    const c0 = gl.xr.getController(0);
    const c1 = gl.xr.getController(1);
    c0.addEventListener("connected", attachHandedness);
    c1.addEventListener("connected", attachHandedness);
    
    return () => {
      c0.removeEventListener("connected", attachHandedness);
      c1.removeEventListener("connected", attachHandedness);
    };
  }, [gl.xr]);

  const mode = useLegoStore((s) => s.mode);
  const bricks = useLegoStore((s) => s.bricks);
  const removeBricks = useLegoStore((s) => s.removeBricks);
  const removeBrick = useLegoStore((s) => s.removeBrick);
  const movingBrickId = useLegoStore((s) => s.movingBrickId);
  const setMovingBrickId = useLegoStore((s) => s.setMovingBrickId);
  const setIsDraggingBrick = useLegoStore((s) => s.setIsDraggingBrick);
  const setJustSelectedBrick = useLegoStore((s) => s.setJustSelectedBrick);
  const selectionMode = useLegoStore((s) => s.selectionMode);
  const locomotionMode = useLegoStore((s) => s.locomotionMode);
  const movementSpeed = useLegoStore((s) => s.movementSpeed);
  const snapTurnAngle = useLegoStore((s) => s.snapTurnAngle);

  const wasTriggerPressed = useRef(false);
  const wasSqueezePressed = useRef(false);
  const wasActionPressed = useRef(false);
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
    const session = gl.xr.getSession();
    if (!session || !sceneGroupRef.current) return;

    let leftController: THREE.Group | null = null;
    let rightController: THREE.Group | null = null;
    let leftGrip: THREE.Group | null = null;
    let rightGrip: THREE.Group | null = null;
    let leftInput: XRInputSource | null = null;
    let rightInput: XRInputSource | null = null;

    const inputSourcesArray = Array.from(session.inputSources);
    for (const source of inputSourcesArray) {
      if (!source) continue;
      if (source.handedness === "left") leftInput = source;
      if (source.handedness === "right") rightInput = source;
    }

    for (let i = 0; i < 2; i++) {
      const c = gl.xr.getController(i);
      const cg = gl.xr.getControllerGrip(i);
      if (!c) continue;

      let handedness = c.userData?.handedness || c.userData?.inputSource?.handedness;
      
      if (!handedness && inputSourcesArray[i]) {
         handedness = inputSourcesArray[i].handedness;
      }

      if (handedness === "left") {
         leftController = c;
         leftGrip = cg;
      } else if (handedness === "right") {
         rightController = c;
         rightGrip = cg;
      }
    }

    // Defaulting logic for controllers if handedness is unknown
    if (!leftInput && !rightInput && inputSourcesArray.length >= 2) {
       leftInput = inputSourcesArray[0];
       rightInput = inputSourcesArray[1];
    } else if (!rightInput && inputSourcesArray.length === 1) {
       // Only one controller? Assume it's the right (primary)
       rightInput = inputSourcesArray[0];
    }

    if (!leftController && leftInput) {
       leftController = gl.xr.getController(inputSourcesArray.indexOf(leftInput));
    }
    if (!rightController && rightInput) {
       rightController = gl.xr.getController(inputSourcesArray.indexOf(rightInput));
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

    const isQuestController = (input: XRInputSource | null) => 
       !!(input && input.targetRayMode === "tracked-pointer" && input.gamepad && input.gamepad.buttons.length > 0);
       
    if (currentPanel === "waitingControllers" || currentPanel === "onboarding") {
      if (isQuestController(rightInput) || isQuestController(leftInput)) {
         // Auto dismiss waiting state if Quest controllers are active.
         // If they were stuck on waitingControllers or onboarding and controllers are ready, clear it out.
         if (currentPanel === "waitingControllers") {
            store.setXRPanel("none");
         }
      }
    }

    // Process Left controller UI buttons
    if (leftInput && leftInput.gamepad) {
      const gp = leftInput.gamepad;
      const xPressed = gp.buttons[4]?.pressed || false;
      const yPressed = gp.buttons[5]?.pressed || false;

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

      wasXPressed.current = xPressed;
      wasYPressed.current = yPressed;
    }

    // Process Right controller UI buttons
    if (rightInput && rightInput.gamepad) {
      const gp = rightInput.gamepad;
      // B button is 5 on right controller, or 4 for some old Oculus mapping
      const bPressed = gp.buttons[5]?.pressed || false;

      if (bPressed && !wasBPressed.current) {
        let handled = false;
        if (currentPanel !== "none") {
          store.setXRPanel("none");
          handled = true;
        }
        if (store.mode === "Move" && store.movingBrickId) {
          store.setMovingBrickId(null);
          store.setIsDraggingBrick(false);
          store.setMode("Build");
          updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
          triggerHaptics(rightInput, HapticType.BRICK_SELECT);
          audioService.playSelect();
          handled = true;
        }
        if (!handled && store.mode !== "Build") {
          store.setMode("Build");
        }
        if (handled) {
          squeezeMoveBlockedRef.current = false;
          movePreviewActiveRef.current = false;
        }
      }

      wasBPressed.current = bPressed;
    }

    // Handle Locomotion (Thumbsticks)
    const dt = Math.min(delta, 0.05);

    if (leftInput && leftInput.gamepad) {
      const xAxis = leftInput.gamepad.axes[2] || 0; // x strafe
      const zAxis = leftInput.gamepad.axes[3] || 0; // z forward/back

      if (locomotionMode === "Smooth") {
        if (Math.abs(xAxis) > 0.1 || Math.abs(zAxis) > 0.1) {
          const speed = movementSpeed * dt;
          const camForward = new THREE.Vector3(0, 0, -1)
            .transformDirection(gl.xr.getCamera().matrixWorld)
            .setY(0)
            .normalize();
          const camRight = new THREE.Vector3(1, 0, 0)
            .transformDirection(gl.xr.getCamera().matrixWorld)
            .setY(0)
            .normalize();

          const moveVec = new THREE.Vector3()
            .addScaledVector(camRight, xAxis * speed)
            .addScaledVector(camForward, zAxis * speed);

          const refSpace = gl.xr.getReferenceSpace();
          if (refSpace) {
            const transform = new XRRigidTransform({
              x: -moveVec.x,
              y: -moveVec.y,
              z: -moveVec.z,
            });
            const newRefSpace = refSpace.getOffsetReferenceSpace(transform);
            gl.xr.setReferenceSpace(newRefSpace);
          }
        }
      }
    }

    // Snap turn
    if (rightInput && rightInput.gamepad) {
      const xAxis = rightInput.gamepad.axes[2] || 0;
      if (Math.abs(xAxis) > 0.5) {
        if (!snapTurnCooldown.current) {
          snapTurnCooldown.current = true;
          const turnAngle = xAxis > 0 ? -snapTurnAngle : snapTurnAngle;
          const turnAngleRad = THREE.MathUtils.degToRad(turnAngle);
          const refSpace = gl.xr.getReferenceSpace();
          if (refSpace) {
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnAngleRad);
            const transform = new XRRigidTransform(new DOMPoint(0,0,0), new DOMPoint(q.x, q.y, q.z, q.w));
            gl.xr.setReferenceSpace(refSpace.getOffsetReferenceSpace(transform));
          }
          setTimeout(() => snapTurnCooldown.current = false, 500);
        }
      } else if (Math.abs(xAxis) < 0.2) {
        snapTurnCooldown.current = false;
      }
    }

    if (rightController && rightInput && rightInput.gamepad) {
      const pos = new THREE.Vector3().setFromMatrixPosition(
        rightController.matrixWorld,
      );
      const fwd = new THREE.Vector3(0, 0, -1)
        .transformDirection(rightController.matrixWorld)
        .normalize();
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

      if ((import.meta as any).env.DEV) {
        const now = Date.now();
        if (!(window as any)._lastVRLaserLog || now - (window as any)._lastVRLaserLog > 1000) {
          (window as any)._lastVRLaserLog = now;
          console.log("[VR] Ray diagnostics", {
            origin: pos.toArray().map((v) => v.toFixed(3)),
            direction: fwd.toArray().map((v) => v.toFixed(3)),
            gridRegistered: targets.some(t => t.name === "Grid"),
            hitTarget: hit?.object?.name || null,
            hitPoint: hit?.point?.toArray().map((v) => v.toFixed(3)) || null,
          });
        }
      }

      let laserDistance = 2.0; // Short length when not hitting anything
      const gp = rightInput.gamepad;
      const triggerPressed = gp.buttons[0]?.pressed || false;
      const squeezePressed = gp.buttons[1]?.pressed || false;
      // right A = 4 (or 3 fallback for some profiles)
      const aPressed = gp.buttons[4]?.pressed || gp.buttons[3]?.pressed || false;
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

        latestHit.current = { hitMenuItem: isMenuItem, onTriggerFn, hitLoc: hit };

        if (isMenuItem && onTriggerFn) {
          latestValidPlacement.current = null;
          updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
        } else if (useLegoStore.getState().xrPanel !== "none") {
          latestValidPlacement.current = null;
          updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
        } else {
          // Normal brick interaction
          const unscaledP3 = hit.point.clone().divideScalar(currentVRScale);
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
          if (hit.object.name === "FloorPlacementCollider" || hit.object.name === "VRFloorCollider")
            targetKind = "floor";
          else if (Math.abs(normal.y) > 0.7) targetKind = "brick-top";
          else targetKind = "brick-side";

          const isFrozenPreview = mode === "Move" && useLegoStore.getState().isDraggingBrick && movePreviewActiveRef.current && !squeezePressed;

          if (isFrozenPreview) {
            // Keep frozen
          } else if (isValidPlacement) {
            latestValidPlacement.current = { p: unscaledP3, n: normal, tk: targetKind };
            updateGhostPosition(unscaledP3, normal, targetKind);
          } else {
            latestValidPlacement.current = null;
            updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
          }
        } // End of placement calc

        if (triggerPressed && !wasTriggerPressed.current) {
          if (isMenuItem && onTriggerFn) {
             onTriggerFn();
             triggerHaptics(rightInput, HapticType.UI_CLICK);
             audioService.playMenu();
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
                   const allb = useLegoStore.getState().bricks;
                   if (hasBrickAbove(b, allb, MODULE_SIZE, BRICK_HEIGHT)) {
                     useLegoStore.getState().setToastMessage("Cannot select: brick has another brick above it.");
                     setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                     triggerHaptics(rightInput, HapticType.ERROR);
                     audioService.playInvalid();
                   } else {
                     useLegoStore.getState().toggleMultiSelectBrickId(b.id);
                     triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                     audioService.playDelete();
                   }
                 } else {
                   removeBrick(b.id);
                   triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                   audioService.playDelete();
                 }
               }
             }
          } else {
             const state = useLegoStore.getState();
             const canCommitMove = mode === "Move" && state.movingBrickId && state.isDraggingBrick && latestValidPlacement.current;
             const canCommitRotationOnly = mode === "Move" && state.movingBrickId && !state.isDraggingBrick;
             const canCommitBuild = mode === "Build" && latestValidPlacement.current;

             if (canCommitMove || canCommitBuild) {
               const success = handleVRCommit(
                  latestValidPlacement.current!.p,
                  latestValidPlacement.current!.n,
                  latestValidPlacement.current!.tk
               );
               if (success) {
                 triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                 audioService.playPlace();
                 movePreviewActiveRef.current = false;
               } else {
                 triggerHaptics(rightInput, HapticType.ERROR);
                 audioService.playInvalid();
               }
             } else if (canCommitRotationOnly) {
               const success = handleVRCommit(
                  new THREE.Vector3(),
                  new THREE.Vector3(0, 1, 0),
                  "none"
               );
               if (success) {
                 triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                 audioService.playPlace();
                 movePreviewActiveRef.current = false;
               } else {
                 triggerHaptics(rightInput, HapticType.ERROR);
                 audioService.playInvalid();
               }
             } else if (mode === "Move" && !state.movingBrickId) {
               useLegoStore.getState().setToastMessage("Select and drag a brick to move it.");
               setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
               triggerHaptics(rightInput, HapticType.ERROR);
               audioService.playInvalid();
             } else {
               useLegoStore.getState().setToastMessage("Invalid placement surface.");
               triggerHaptics(rightInput, HapticType.ERROR);
               audioService.playInvalid();
             }
          }
        }

        if (squeezePressed && wasSqueezePressed.current) {
          if (useLegoStore.getState().mode === "Move" && movingBrickId && squeezeStartPosRef.current && !useLegoStore.getState().isDraggingBrick && !squeezeMoveBlockedRef.current) {
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
                    if (g.some((bz: any) => hasBrickAbove(bz, allb, MODULE_SIZE, BRICK_HEIGHT, gIds))) {
                      useLegoStore.getState().setToastMessage("Cannot delete: selection is blocked by other bricks on top.");
                      setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.playInvalid();
                    } else {
                      removeBricks(gIds);
                      triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                      audioService.playDelete();
                    }
                  } else if (selectionMode === "Multi") {
                    useLegoStore.getState().toggleMultiSelectBrickId(b.id);
                    triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                    audioService.playDelete();
                  } else {
                    if (hasBrickAbove(b, useLegoStore.getState().bricks, MODULE_SIZE, BRICK_HEIGHT)) {
                      useLegoStore.getState().setToastMessage("Cannot delete: brick has another brick above it.");
                      setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.playInvalid();
                    } else {
                      removeBrick(b.id);
                      triggerHaptics(rightInput, HapticType.BRICK_DELETE);
                      audioService.playDelete();
                    }
                  }
                } else if (currentMode === "Move" && !movingBrickId) {
                  if (selectionMode === "Group") {
                    setMovingBrickId(b.id);
                    const allb = useLegoStore.getState().bricks;
                    const g = getGroupBricks(b, allb);
                    const gIds = g.map((bz: any) => bz.id);
                    const isBlocked = g.some((bz: any) => hasBrickAbove(bz, allb, MODULE_SIZE, BRICK_HEIGHT, gIds));
                    
                    setIsDraggingBrick(false);
                    squeezeMoveBlockedRef.current = isBlocked;
                    movePreviewActiveRef.current = false;
                    squeezeStartPosRef.current = pos.clone();
                    
                    if (isBlocked) {
                      useLegoStore.getState().setToastMessage("Cannot move: selection is blocked by other bricks on top.");
                      setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.playInvalid();
                    }
                    
                    setJustSelectedBrick(true);
                    triggerHaptics(rightInput, HapticType.BRICK_SELECT);
                    audioService.playSelect();
                    useLegoStore.getState().triggerSetGhostRotation(b.rotation);
                  } else if (selectionMode === "Multi") {
                    const stateBefore = useLegoStore.getState();
                    stateBefore.toggleMultiSelectBrickId(b.id);
                    const stateAfter = useLegoStore.getState();
                    const isNowSelected = stateAfter.multiSelectedBrickIds.includes(b.id);
                    
                    if (isNowSelected) {
                      setMovingBrickId(b.id);
                      const isBlocked = stateAfter.multiSelectedBrickIds.some(id => {
                        const br = stateAfter.bricks.find(bk => bk.id === id);
                        return br && hasBrickAbove(br, stateAfter.bricks, MODULE_SIZE, BRICK_HEIGHT, stateAfter.multiSelectedBrickIds);
                      });
                      setIsDraggingBrick(false);
                      squeezeMoveBlockedRef.current = isBlocked;
                      movePreviewActiveRef.current = false;
                      squeezeStartPosRef.current = pos.clone();
                      
                      if (isBlocked) {
                        useLegoStore.getState().setToastMessage("Cannot move: selection is blocked by other bricks on top.");
                        setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                        triggerHaptics(rightInput, HapticType.ERROR);
                        audioService.playInvalid();
                      }
                    } else if (stateBefore.movingBrickId === b.id) {
                      const newAnchorId = stateAfter.multiSelectedBrickIds[stateAfter.multiSelectedBrickIds.length - 1];
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
                    audioService.playSelect();
                    useLegoStore.getState().triggerSetGhostRotation(b.rotation);
                  } else {
                    setMovingBrickId(b.id);
                    const blocks = useLegoStore.getState().bricks;
                    const isBlocked = hasBrickAbove(b, blocks, MODULE_SIZE, BRICK_HEIGHT);
                    setIsDraggingBrick(false);
                    squeezeMoveBlockedRef.current = isBlocked;
                    movePreviewActiveRef.current = false;
                    squeezeStartPosRef.current = pos.clone();
                    
                    if (isBlocked) {
                      useLegoStore.getState().setToastMessage("Cannot move: selection is blocked by other bricks on top.");
                      setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                      triggerHaptics(rightInput, HapticType.ERROR);
                      audioService.playInvalid();
                    }
                    setJustSelectedBrick(true);
                    triggerHaptics(rightInput, HapticType.BRICK_SELECT);
                    audioService.playSelect();
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
        const isFrozenPreview = mode === "Move" && useLegoStore.getState().isDraggingBrick && movePreviewActiveRef.current && !squeezePressed;
        if (!isFrozenPreview) {
          updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
          latestValidPlacement.current = null;
        }
        latestHit.current = null;

        if (triggerPressed && !wasTriggerPressed.current) {
           if (useLegoStore.getState().xrPanel !== "none") {
              // Ignore trigger completely
           } else {
             const state = useLegoStore.getState();
             const canCommitFrozenMove = mode === "Move" && state.movingBrickId && state.isDraggingBrick && movePreviewActiveRef.current && latestValidPlacement.current;
             const canCommitRotationOnly = mode === "Move" && state.movingBrickId && !state.isDraggingBrick;

             if (canCommitFrozenMove) {
                 const success = handleVRCommit(
                    latestValidPlacement.current!.p,
                    latestValidPlacement.current!.n,
                    latestValidPlacement.current!.tk
                 );
                 if (success) {
                   triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                   audioService.playPlace();
                   movePreviewActiveRef.current = false;
                 } else {
                   triggerHaptics(rightInput, HapticType.ERROR);
                   audioService.playInvalid();
                 }
             } else if (canCommitRotationOnly) {
                 const success = handleVRCommit(
                    new THREE.Vector3(),
                    new THREE.Vector3(0, 1, 0),
                    "none"
                 );
                 if (success) {
                   triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                   audioService.playPlace();
                   movePreviewActiveRef.current = false;
                 } else {
                   triggerHaptics(rightInput, HapticType.ERROR);
                   audioService.playInvalid();
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
          audioService.playRotate();
        }
      }

      // Render laser
      if (laserRef.current) {
        laserRef.current.visible = true;
        laserRef.current.position.copy(pos);
        laserRef.current.quaternion.setFromRotationMatrix(
          rightController.matrixWorld,
        );
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
        const state = useLegoStore.getState();
        if (state.mode === "Move") {
            if (state.isDraggingBrick && movePreviewActiveRef.current) {
               if (latestValidPlacement.current) {
                  const success = handleVRCommit(
                     latestValidPlacement.current.p,
                     latestValidPlacement.current.n,
                     latestValidPlacement.current.tk
                  );
                  if (success) {
                    triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                    audioService.playPlace();
                  } else {
                    triggerHaptics(rightInput, HapticType.ERROR);
                    audioService.playInvalid();
                    state.setMovingBrickId(null);
                  }
               } else {
                  state.setToastMessage("Invalid placement surface.");
                  setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                  triggerHaptics(rightInput, HapticType.ERROR);
                  audioService.playInvalid();
                  state.setMovingBrickId(null);
               }
               movePreviewActiveRef.current = false;
            }
            state.setIsDraggingBrick(false);
            squeezeMoveBlockedRef.current = false;
        }
      }

      // Always track state
      wasActionPressed.current = actionPressed;
      wasTriggerPressed.current = triggerPressed;
      wasSqueezePressed.current = squeezePressed;

      if (isDebugXR && debugTextRef.current) {
         debugTextRef.current.text = [
            `L(X/Y): ${wasXPressed.current}/${wasYPressed.current} | RTrig: ${triggerPressed} | A/B: ${actionPressed}/${wasBPressed.current}`,
            `LAxes: ${leftInput?.gamepad?.axes.map(a => a.toFixed(1)).join(',') || 'none'}`,
            `RAxes: ${rightInput?.gamepad?.axes.map(a => a.toFixed(1)).join(',') || 'none'}`,
            `Hit: ${hit ? hit.object.name : 'none'}`,
            `Sel: ${useLegoStore.getState().multiSelectedBrickIds.join(',')} | Mv: ${useLegoStore.getState().movingBrickId}`,
            `Drag: ${useLegoStore.getState().isDraggingBrick}`
         ].join('\n');
      }

    } else {
      if (laserRef.current) laserRef.current.visible = false;
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false;
    }
  });

  return (
    <group>
      <mesh ref={laserRef} geometry={laserGeo} visible={false} raycast={() => null}>
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
           <Text ref={debugTextRef} color="chartreuse" fontSize={0.05} anchorX="center" anchorY="middle"> </Text>
        </group>
      )}
    </group>
  );
};
