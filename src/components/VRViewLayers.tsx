import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLegoStore, getGroupBricks, hasBrickAbove } from "../Store";
import { MODULE_SIZE, BRICK_HEIGHT } from "../constants";
import { audioService } from "../services/AudioService";
import { triggerHaptics, HapticType } from "../lib/haptics";

import { vrTargetManager } from "../lib/vrTargets";

export const HumanViewLayer = ({
  currentVRScale,
  sceneGroupRef,
  updateGhostPosition,
}: {
  currentVRScale: number;
  sceneGroupRef: React.RefObject<THREE.Group>;
  updateGhostPosition: (
    p: THREE.Vector3,
    n: THREE.Vector3,
    tk?: string,
  ) => void;
}) => {
  const { gl, scene } = useThree();
  const raycaster = new THREE.Raycaster();

  useEffect(() => {
    const attachHandedness = (event: any) => {
      event.target.userData.handedness = event.data.handedness;
      if ((import.meta as any).env.DEV) {
        console.log(`[VR] Controller Connected!`, {
          handedness: event.data.handedness,
          targetRayMode: event.data.targetRayMode,
          gamepad: !!event.data.gamepad,
          profiles: event.data.profiles,
        });
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
  const snapTurnCooldown = useRef(false);

  const isValidTarget = (obj: THREE.Object3D) => {
    let curr: THREE.Object3D | null = obj;
    let isMenu = false;
    while (curr) {
      if (
        curr.userData?.isGhost ||
        curr.name?.includes("ghost") ||
        curr.name?.startsWith("presetPreview") ||
        curr.name === "GridHelper" ||
        curr.name === "Grid"
      ) {
        return false;
      }
      if (curr.userData?.isVRMenuItem) isMenu = true;
      curr = curr.parent;
    }

    // VR target priority
    const menuVisible = useLegoStore.getState().vrMenuVisible;
    if (menuVisible) {
      return isMenu;
    } else {
      if (isMenu) return false;
      return true;
    }
  };

  const laserRef = useRef<THREE.Mesh>(null);
  const hoverMarkerRef = useRef<THREE.Mesh>(null);

  const laserGeo = React.useMemo(() => {
    const geo = new THREE.BoxGeometry(0.002, 0.002, 1);
    geo.translate(0, 0, -0.5); // Pivot at the start of the laser
    return geo;
  }, []);

  const [aimedBrickPoint, setAimedBrickPoint] = useState<{
    p: THREE.Vector3;
    n: THREE.Vector3;
  } | null>(null);

  const latestValidPlacement = useRef<{
    p: THREE.Vector3;
    n: THREE.Vector3;
    tk: string;
  } | null>(null);

  useFrame((state, delta) => {
    const session = gl.xr.getSession();
    if (!session || !sceneGroupRef.current) return;

    let leftController: THREE.Group | null = null;
    let rightController: THREE.Group | null = null;
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
      if (c && c.userData && c.userData.handedness === "left") {
        leftController = c;
      }
      if (c && c.userData && c.userData.handedness === "right") {
        rightController = c;
      }
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

    // Handle Locomotion (Thumbsticks)
    const dt = Math.min(delta, 0.05);
    const menuVisible = useLegoStore.getState().vrMenuVisible;

    if (leftInput && leftInput.gamepad && !menuVisible) {
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

    if (rightInput && rightInput.gamepad && !menuVisible) {
      const xAxis = rightInput.gamepad.axes[2] || 0;
      if (Math.abs(xAxis) > 0.5) {
        if (!snapTurnCooldown.current) {
          snapTurnCooldown.current = true;
          const turnAngleRad = (snapTurnAngle * Math.PI) / 180;
          const turnAngle = xAxis > 0 ? -turnAngleRad : turnAngleRad;
          const refSpace = gl.xr.getReferenceSpace();
          if (refSpace) {
            const rotTransform = new XRRigidTransform(
              { x: 0, y: 0, z: 0 },
              {
                x: 0,
                y: Math.sin(turnAngle / 2),
                z: 0,
                w: Math.cos(turnAngle / 2),
              },
            );
            const newRefSpace = refSpace.getOffsetReferenceSpace(rotTransform);
            gl.xr.setReferenceSpace(newRefSpace);
            triggerHaptics(rightInput, HapticType.SNAP_TURN);
            audioService.playSelect();
          }
        }
      } else {
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

      let laserDistance = 0.5; // Short length when not hitting anything
      const gp = rightInput.gamepad;
      const triggerPressed = gp.buttons[0]?.pressed || false;
      const squeezePressed = gp.buttons[1]?.pressed || false;
      // right A = 4
      const aPressed = gp.buttons[4]?.pressed || false;
      const actionPressed = aPressed;

      if (hit) {
        laserDistance = hit.distance;
        let currentHitObj: THREE.Object3D | null = hit.object;
        let isMenuItem = false;
        let onTriggerFn = null;

        let hitMenuLabel = "";

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

        if (isMenuItem && onTriggerFn) {
          if (triggerPressed && !wasTriggerPressed.current) {
            onTriggerFn();
            triggerHaptics(rightInput, HapticType.UI_CLICK);
            audioService.playMenu();
          }
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
          if (hit.object.name === "FloorPlacementCollider")
            targetKind = "floor";
          else if (Math.abs(normal.y) > 0.7) targetKind = "brick-top";
          else targetKind = "brick-side";

          if (isValidPlacement) {
            latestValidPlacement.current = { p: unscaledP3, n: normal, tk: targetKind };
            updateGhostPosition(unscaledP3, normal, targetKind);
          } else {
            latestValidPlacement.current = null;
            updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
          }

          if (triggerPressed && !wasTriggerPressed.current) {
            if (mode === "Delete") {
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
            } else if (latestValidPlacement.current) {
              if ((import.meta as any).env.DEV) {
                console.log("[VR] Target count:", targets.length);
                const activeNames = targets
                  .filter((t) => isValidTarget(t))
                  .map((t) => t.name)
                  .filter(Boolean);
                console.log(
                  "[VR] Active target names:",
                  Array.from(new Set(activeNames)),
                );
                console.log(
                  "[VR] Commit trigger. Point:",
                  latestValidPlacement.current.p,
                  "Normal:",
                  latestValidPlacement.current.n,
                  "Object:",
                  hit.object?.name,
                );
              }
              useLegoStore.getState().triggerVRControllerAction({
                type: "trigger",
                action: "commit",
                point: latestValidPlacement.current.p,
                normal: latestValidPlacement.current.n,
                targetKind: latestValidPlacement.current.tk
              });
              triggerHaptics(rightInput, HapticType.BRICK_PLACE);
              audioService.playPlace();
            } else {
              if ((import.meta as any).env.DEV) {
                console.log("[VR] Placement rejected");
              }
              useLegoStore
                .getState()
                .setToastMessage("Invalid placement surface.");
              triggerHaptics(rightInput, HapticType.ERROR);
              audioService.playInvalid();
            }
          }

          // Handle squeeze release for "Release to Drop" in Move mode
          if (!squeezePressed && wasSqueezePressed.current) {
            if (mode === "Move" && movingBrickId) {
              // We only commit if we were actually dragging (to avoid tiny accidental clicks committing)
              if (latestValidPlacement.current) {
                useLegoStore.getState().triggerVRControllerAction({
                  type: "trigger",
                  action: "commit",
                  point: latestValidPlacement.current.p,
                  normal: latestValidPlacement.current.n,
                  targetKind: latestValidPlacement.current.tk
                });
                triggerHaptics(rightInput, HapticType.BRICK_PLACE);
                audioService.playPlace();
              }
            }
          }

          if (actionPressed && !wasActionPressed.current) {
            if (mode === "Move" && movingBrickId) {
              useLegoStore
                .getState()
                .triggerVRControllerAction({ type: "cancelMove" });
              setMovingBrickId(null);
              setIsDraggingBrick(false);
              triggerHaptics(rightInput, HapticType.BRICK_SELECT);
              audioService.playSelect();
            } else if (mode === "Build" || mode === "Move") {
              useLegoStore.getState().triggerRotateGhost();
              triggerHaptics(rightInput, HapticType.ROTATE);
              audioService.playRotate();
            }
          }

          if (squeezePressed && !wasSqueezePressed.current) {
            if (mode === "Delete" || mode === "Move") {
              const instId = hit.instanceId;
              const ud = hit.object.userData;
              if (instId !== undefined && ud && ud.bricks) {
                let brickIndex = instId;
                if (ud.isStud) {
                  brickIndex = Math.floor(instId / (ud.w * ud.d));
                }
                const b = ud.bricks[brickIndex];
                if (b) {
                  if (mode === "Delete") {
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
                  } else if (mode === "Move" && !movingBrickId) {
                    if (selectionMode === "Group") {
                      setMovingBrickId(b.id);
                      const allb = useLegoStore.getState().bricks;
                      const g = getGroupBricks(b, allb);
                      const gIds = g.map((bz: any) => bz.id);
                      const isBlocked = g.some((bz: any) => hasBrickAbove(bz, allb, MODULE_SIZE, BRICK_HEIGHT, gIds));
                      
                      setIsDraggingBrick(!isBlocked);
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
                        setIsDraggingBrick(!isBlocked);
                        if (isBlocked) {
                          useLegoStore.getState().setToastMessage("Cannot move: selection is blocked by other bricks on top.");
                          setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                          triggerHaptics(rightInput, HapticType.ERROR);
                          audioService.playInvalid();
                        }
                      } else if (stateBefore.movingBrickId === b.id) {
                        const newAnchorId = stateAfter.multiSelectedBrickIds[stateAfter.multiSelectedBrickIds.length - 1];
                        setMovingBrickId(newAnchorId || null);
                        if (newAnchorId) {
                           const isBlocked = stateAfter.multiSelectedBrickIds.some(id => {
                            const br = stateAfter.bricks.find(bk => bk.id === id);
                            return br && hasBrickAbove(br, stateAfter.bricks, MODULE_SIZE, BRICK_HEIGHT, stateAfter.multiSelectedBrickIds);
                          });
                          setIsDraggingBrick(!isBlocked);
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
                      setIsDraggingBrick(!isBlocked);
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
        }
      } else {
        // Not aimed at valid target, clear action states without logic
        // if users click trigger, nothing happens.
        useLegoStore.getState().setVRMenuHoverContent("");
        updateGhostPosition(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1, 0), "none");
        latestValidPlacement.current = null;
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
            hit.object.name.includes("BrickBody") ||
            hit.object.name.includes("BrickStuds") ||
            hit.object.name.includes("VRMenuBtn"))
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

      // Always track state
      wasActionPressed.current = actionPressed;
      wasTriggerPressed.current = triggerPressed;
      wasSqueezePressed.current = squeezePressed;
    } else {
      if (laserRef.current) laserRef.current.visible = false;
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false;
    }
  });

  return (
    <group>
      <mesh ref={laserRef} geometry={laserGeo} visible={false}>
        <meshBasicMaterial
          color="#aaaaaa"
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={hoverMarkerRef} visible={false}>
        <ringGeometry args={[0.02, 0.025, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          depthTest={false}
        />
      </mesh>
    </group>
  );
};
