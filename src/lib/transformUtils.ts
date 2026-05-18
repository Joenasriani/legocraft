import { BrickData } from "../Store";

/**
 * Calculates a 90-degree aligned rotation modifier.
 */
export function calculateRotMod(rotation: number): number {
  return (Math.round(rotation / 90) * 90) % 360;
}

/**
 * Rotates relative XZ coordinates by a modifier (multiple of 90).
 */
export function rotateRelative(x: number, z: number, rotMod: number): { x: number, z: number } {
  let nx = x;
  let nz = z;
  const normalizedRot = ((rotMod % 360) + 360) % 360;
  
  if (normalizedRot === 90) {
    nx = -z;
    nz = x;
  } else if (normalizedRot === 180) {
    nx = -x;
    nz = -z;
  } else if (normalizedRot === 270) {
    nx = z;
    nz = -x;
  }
  return { x: nx, z: nz };
}

/**
 * Transforms a single brick based on a pivot and a rotation modifier.
 */
export function transformBrick(
  brick: BrickData,
  pivot: [number, number, number],
  newPivotPosition: [number, number, number],
  rotMod: number
): BrickData {
  const ox = brick.position[0] - pivot[0];
  const oy = brick.position[1] - pivot[1];
  const oz = brick.position[2] - pivot[2];
  
  const rotated = rotateRelative(ox, oz, rotMod);
  
  return {
    ...brick,
    rotation: (((brick.rotation || 0) % 360) + rotMod + 360) % 360,
    position: [
      newPivotPosition[0] + rotated.x,
      newPivotPosition[1] + oy,
      newPivotPosition[2] + rotated.z,
    ],
  };
}

/**
 * Transforms a group of bricks based on a pivot and a rotation modifier.
 */
export function transformBricks(
  bricks: BrickData[],
  pivot: [number, number, number],
  newPivotPosition: [number, number, number],
  rotMod: number
): BrickData[] {
  return bricks.map(b => transformBrick(b, pivot, newPivotPosition, rotMod));
}

/**
 * Calculates the world position of a pivot given a reference brick's target position
 * and its original relationship to the pivot.
 */
export function calculatePivotPosition(
  referenceBrickOriginalPos: [number, number, number],
  pivotOriginalPos: [number, number, number],
  referenceBrickTargetPos: [number, number, number],
  rotMod: number
): [number, number, number] {
  const oxA = referenceBrickOriginalPos[0] - pivotOriginalPos[0];
  const oyA = referenceBrickOriginalPos[1] - pivotOriginalPos[1];
  const ozA = referenceBrickOriginalPos[2] - pivotOriginalPos[2];
  
  const rotatedOffset = rotateRelative(oxA, ozA, rotMod);
  
  return [
    referenceBrickTargetPos[0] - rotatedOffset.x,
    referenceBrickTargetPos[1] - oyA,
    referenceBrickTargetPos[2] - rotatedOffset.z,
  ];
}
