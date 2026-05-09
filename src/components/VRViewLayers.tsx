import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLegoStore, getGroupBricks } from "../Store";

import { vrTargetManager } from "../lib/vrTargets";

export const HumanViewLayer = ({
  currentVRScale,
  sceneGroupRef,
  updateGhostPosition,
}: {
  currentVRScale: number;
  sceneGroupRef: React.RefObject<THREE.Group>;
  updateGhostPosition: (p: THREE.Vector3, n: THREE.Vector3) => void;
}) => {
  const { gl, scene } = useThree();
  const raycaster = new THREE.Raycaster();

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
  const snapTurnCooldown = useRef(false);

  const isValidTarget = (obj: THREE.Object3D) => {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      if (curr.userData?.isGhost || curr.name?.includes("ghost")) return false;
      curr = curr.parent;
    }
    return true;
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

  useFrame(() => {
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    if (!session || !sceneGroupRef.current) return;

    let leftController: THREE.Group | null = null;
    let rightController: THREE.Group | null = null;
    let leftInput: XRInputSource | null = null;
    let rightInput: XRInputSource | null = null;

    for (let i = 0; i < session.inputSources.length; i++) {
      const source = session.inputSources[i];
      if (source && source.handedness === "left") {
        leftController = gl.xr.getController(i);
        leftInput = source;
      } else if (source && source.handedness === "right") {
        rightController = gl.xr.getController(i);
        rightInput = source;
      }
    }

    // Handle Locomotion (Thumbsticks)
    const dt = 1 / 60; // Approximate
    const menuVisible = (window as any).__vrMenuVisible;

    if (leftInput && leftInput.gamepad && !menuVisible) {
      const xAxis = leftInput.gamepad.axes[2] || 0; // x strafe
      const zAxis = leftInput.gamepad.axes[3] || 0; // z forward/back
      if (Math.abs(xAxis) > 0.1 || Math.abs(zAxis) > 0.1) {
        const speed = 2.0 * dt; // 2 m/s
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

    if (rightInput && rightInput.gamepad && !menuVisible) {
      const xAxis = rightInput.gamepad.axes[2] || 0;
      if (Math.abs(xAxis) > 0.5) {
        if (!snapTurnCooldown.current) {
          snapTurnCooldown.current = true;
          const turnAngle = xAxis > 0 ? -Math.PI / 4 : Math.PI / 4;
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

      let laserDistance = 0.5; // Short length when not hitting anything
      const gp = rightInput.gamepad;
      const triggerPressed = gp.buttons[0]?.pressed || false;
      const squeezePressed = gp.buttons[1]?.pressed || false;
      const aPressed = gp.buttons[4]?.pressed || false;
      const bPressed = gp.buttons[5]?.pressed || false;
      const actionPressed = aPressed || bPressed;

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

        window.dispatchEvent(
          new CustomEvent("vr-menu-hover", { detail: hitMenuLabel }),
        );

        if (isMenuItem && onTriggerFn) {
          if (triggerPressed && !wasTriggerPressed.current) {
            onTriggerFn();
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

          updateGhostPosition(unscaledP3, normal);

          if (triggerPressed && !wasTriggerPressed.current) {
            window.dispatchEvent(
              new CustomEvent("vr-controller-action", {
                detail: {
                  type: "trigger",
                  action: "commit",
                  point: unscaledP3,
                  normal: normal,
                },
              }),
            );
          }

          if (actionPressed && !wasActionPressed.current) {
            if (mode === "Move" && movingBrickId) {
              window.dispatchEvent(
                new CustomEvent("vr-controller-action", {
                  detail: { type: "cancelMove" },
                }),
              );
              setMovingBrickId(null);
              setIsDraggingBrick(false);
            } else if (mode === "Build" || mode === "Move") {
              window.dispatchEvent(new CustomEvent("rotate-ghost"));
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
                      removeBricks(g.map((bz: any) => bz.id));
                    } else {
                      removeBrick(b.id);
                    }
                  } else if (mode === "Move" && !movingBrickId) {
                    setMovingBrickId(b.id);
                    setIsDraggingBrick(true);
                    setJustSelectedBrick(true);
                    window.dispatchEvent(
                      new CustomEvent("set-ghost-rotation", {
                        detail: b.rotation,
                      }),
                    );
                  }
                }
              }
            }
          }
        }
      } else {
        // Not aimed at valid target, clear action states without logic
        // if users click trigger, nothing happens.
        window.dispatchEvent(new CustomEvent("vr-menu-hover", { detail: "" }));
      }

      // Always track state
      wasActionPressed.current = actionPressed;
      wasTriggerPressed.current = triggerPressed;
      wasSqueezePressed.current = squeezePressed;

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
          (hit.object.name === "BrickBodyInstanced" ||
            hit.object.name === "BrickStudsInstanced")
        ) {
          hoverMarkerRef.current.visible = true;
          hoverMarkerRef.current.position.copy(hit.point);
          const normal = hit.face?.normal
            ? hit.face.normal
                .clone()
                .transformDirection(hit.object.matrixWorld)
                .normalize()
            : new THREE.Vector3(0, 1, 0);

          // Align marker with the normal
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            normal,
          );
          hoverMarkerRef.current.quaternion.copy(quaternion);
        } else {
          hoverMarkerRef.current.visible = false;
        }
      }
    } else {
      if (laserRef.current) laserRef.current.visible = false;
      if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false;
    }
  });

  return (
    <>
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
    </>
  );
};
