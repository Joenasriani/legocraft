import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLegoStore, getGroupBricks } from '../Store';

export const HumanViewLayer = ({ currentVRScale, sceneGroupRef, updateGhostPosition }: { 
  currentVRScale: number, 
  sceneGroupRef: React.RefObject<THREE.Group>, 
  updateGhostPosition: (p: THREE.Vector3, n: THREE.Vector3) => void 
}) => {
  const { gl } = useThree();
  const raycaster = new THREE.Raycaster();
  const downVector = new THREE.Vector3(0, -1, 0);

  const mode = useLegoStore(s => s.mode);
  const bricks = useLegoStore(s => s.bricks);
  const removeBricks = useLegoStore(s => s.removeBricks);
  const removeBrick = useLegoStore(s => s.removeBrick);
  const movingBrickId = useLegoStore(s => s.movingBrickId);
  const setMovingBrickId = useLegoStore(s => s.setMovingBrickId);
  const setIsDraggingBrick = useLegoStore(s => s.setIsDraggingBrick);
  const setJustSelectedBrick = useLegoStore(s => s.setJustSelectedBrick);
  const selectionMode = useLegoStore(s => s.selectionMode);

  const wasTriggerPressed = useRef(false);
  const wasSqueezePressed = useRef(false);

  const isValidTarget = (obj: THREE.Object3D) => {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      if (curr.userData?.isGhost || curr.name?.includes('ghost')) return false;
      curr = curr.parent;
    }
    return true;
  };

  useFrame(() => {
    const session = gl.xr.isPresenting ? gl.xr.getSession() : null;
    if (!session || !sceneGroupRef.current) return;

    let rightController: THREE.Group | null = null;
    let rightInput: XRInputSource | null = null;

    for (let i = 0; i < 2; i++) {
        const source = session.inputSources[i];
        if (source && source.handedness === 'right') {
            rightController = gl.xr.getController(i);
            rightInput = source;
            break;
        }
    }

    if (rightController && rightInput && rightInput.gamepad) {
        const pos = new THREE.Vector3().setFromMatrixPosition(rightController.matrixWorld);
        raycaster.set(pos, downVector);

        const intersects = raycaster.intersectObject(sceneGroupRef.current, true);
        
        let hit = null;
        for (const inter of intersects) {
            if (isValidTarget(inter.object)) {
                hit = inter;
                break;
            }
        }

        if (hit) {
            const unscaledP3 = hit.point.clone().divideScalar(currentVRScale);
            const normal = hit.face?.normal ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize() : new THREE.Vector3(0, 1, 0);
            
            updateGhostPosition(unscaledP3, normal);

            const gp = rightInput.gamepad;
            const triggerPressed = gp.buttons[0]?.pressed || false;
            const squeezePressed = gp.buttons[1]?.pressed || false;

            if (triggerPressed && !wasTriggerPressed.current) {
                window.dispatchEvent(new CustomEvent('human-view-action', { detail: { type: 'trigger' } }));
            }

            if (squeezePressed && !wasSqueezePressed.current) {
                if (mode === 'Delete' || mode === 'Move') {
                    const instId = hit.instanceId;
                    const ud = hit.object.userData;
                    if (instId !== undefined && ud && ud.bricks) {
                        let brickIndex = instId;
                        if (ud.isStud) {
                            brickIndex = Math.floor(instId / (ud.w * ud.d));
                        }
                        const b = ud.bricks[brickIndex];
                        if (b) {
                            if (mode === 'Delete') {
                                if (selectionMode === 'Group') {
                                    const allb = useLegoStore.getState().bricks;
                                    const g = getGroupBricks(b, allb);
                                    removeBricks(g.map((bz: any) => bz.id));
                                } else {
                                    removeBrick(b.id);
                                }
                            } else if (mode === 'Move' && !movingBrickId) {
                                setMovingBrickId(b.id);
                                setIsDraggingBrick(true);
                                setJustSelectedBrick(true);
                                window.dispatchEvent(new CustomEvent("set-ghost-rotation", { detail: b.rotation }));
                            }
                        }
                    }
                }
            }

            wasTriggerPressed.current = triggerPressed;
            wasSqueezePressed.current = squeezePressed;
        } else {
            const gp = rightInput?.gamepad;
            if (gp) {
                wasTriggerPressed.current = gp.buttons[0]?.pressed || false;
                wasSqueezePressed.current = gp.buttons[1]?.pressed || false;
            }
        }
    }
  });

  return null;
};

export const MicroViewLayer = () => { return null; };
