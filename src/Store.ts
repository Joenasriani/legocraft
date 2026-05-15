import { create } from "zustand";
import {
  MODULE_SIZE,
  BRICK_HEIGHT,
  STUD_RADIUS,
  STUD_HEIGHT,
  HALF_MODULE,
} from "./constants";

export type BrickType = "1x1" | "1x2" | "1x3" | "2x2" | "2x3" | "2x4" | "3x3" | "3x4" | "4x4" | "4x5" | "5x5";
export const BRICK_TYPES: BrickType[] = [
  "1x2", "1x3", "2x2", "2x3", "2x4",
  "3x3", "3x4", "4x4", "4x5", "5x5",
];
export const PLACEMENT_EPSILON = 0.002;

export interface BrickData {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number; // Y-axis rotation in degrees
  groupId?: string;
}

export const areBricksConnected = (b1: BrickData, b2: BrickData): boolean => {
  const a1 = getBrickAABB(b1);
  const a2 = getBrickAABB(b2);
  const dy = Math.abs(b1.position[1] - b2.position[1]);

  const overlapX = Math.max(
    0,
    Math.min(a1.maxX, a2.maxX) - Math.max(a1.minX, a2.minX),
  );
  const overlapZ = Math.max(
    0,
    Math.min(a1.maxZ, a2.maxZ) - Math.max(a1.minZ, a2.minZ),
  );

  if (dy > BRICK_HEIGHT + PLACEMENT_EPSILON) return false;

  if (dy < PLACEMENT_EPSILON) {
    const touchX =
      Math.abs(a1.maxX - a2.minX) < PLACEMENT_EPSILON ||
      Math.abs(a2.maxX - a1.minX) < PLACEMENT_EPSILON;
    const touchZ =
      Math.abs(a1.maxZ - a2.minZ) < PLACEMENT_EPSILON ||
      Math.abs(a2.maxZ - a1.minZ) < PLACEMENT_EPSILON;
    return (
      (overlapX > PLACEMENT_EPSILON && touchZ) ||
      (overlapZ > PLACEMENT_EPSILON && touchX) ||
      (overlapX > PLACEMENT_EPSILON && overlapZ > PLACEMENT_EPSILON)
    );
  } else {
    return overlapX > PLACEMENT_EPSILON && overlapZ > PLACEMENT_EPSILON;
  }
};

export const getGroupBricks = (
  startBrick: BrickData,
  allBricks: BrickData[],
): BrickData[] => {
  if (startBrick.groupId) {
    return allBricks.filter((b) => b.groupId === startBrick.groupId);
  }

  const visited = new Set<string>();
  const queue = [startBrick];
  visited.add(startBrick.id);

  const group: BrickData[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    group.push(curr);

    for (const b of allBricks) {
      if (!visited.has(b.id) && areBricksConnected(curr, b)) {
        visited.add(b.id);
        queue.push(b);
      }
    }
  }
  return group;
};

export const isValidBrickData = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  if (typeof item.id !== "string") return false;
  if (!BRICK_TYPES.includes(item.type)) return false;
  if (typeof item.color !== "string") return false;
  if (
    !Array.isArray(item.position) ||
    item.position.length !== 3 ||
    !item.position.every(
      (n: any) => typeof n === "number" && Number.isFinite(n),
    )
  )
    return false;
  if (typeof item.rotation !== "number" || !Number.isFinite(item.rotation))
    return false;
  return true;
};

export const getBrickDimensions = (type: BrickType) => {
  switch (type) {
    case "1x1": return { w: 1, d: 1 };
    case "1x2": return { w: 1, d: 2 };
    case "1x3": return { w: 1, d: 3 };
    case "2x2": return { w: 2, d: 2 };
    case "2x3": return { w: 2, d: 3 };
    case "2x4": return { w: 2, d: 4 };
    case "3x3": return { w: 3, d: 3 };
    case "3x4": return { w: 3, d: 4 };
    case "4x4": return { w: 4, d: 4 };
    case "4x5": return { w: 4, d: 5 };
    case "5x5": return { w: 5, d: 5 };
    default:
      return { w: 2, d: 2 };
  }
};

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const getBrickAABB = (brick: Omit<BrickData, "color">): AABB => {
  const { w, d } = getBrickDimensions(brick.type);
  const rot = Math.round(brick.rotation / 90) % 4; // 0, 1, 2, 3
  const isRotated = rot === 1 || rot === 3 || rot === -1 || rot === -3;
  const ew = isRotated ? d : w;
  const ed = isRotated ? w : d;

  const w_size = ew * 0.08;
  const d_size = ed * 0.08;

  return {
    minX: brick.position[0] - w_size / 2,
    maxX: brick.position[0] + w_size / 2,
    minZ: brick.position[2] - d_size / 2,
    maxZ: brick.position[2] + d_size / 2,
  };
};

export function getActivePresetBricks(
  presetName: ActivePresetName | string | null,
  clipboardBricks?: BrickData[],
) {
  if (!presetName) return null;
  if (presetName === "clipboard") return clipboardBricks ?? [];
  return PRESETS[presetName as PresetName] ?? null;
}

export const getPresetInfo = (
  presetName: string,
  clipboardBricks?: BrickData[],
) => {
  const bricks = getActivePresetBricks(presetName, clipboardBricks);
  if (!bricks) return { cx: 0, cz: 0, w: 1, d: 1 };

  const validBricks = bricks.filter(isValidBrickData);
  if (validBricks.length === 0) return { cx: 0, cz: 0, w: 1, d: 1 };

  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const b of validBricks) {
    const aabb = getBrickAABB(b);
    if (aabb.minX < minX) minX = aabb.minX;
    if (aabb.maxX > maxX) maxX = aabb.maxX;
    if (aabb.minZ < minZ) minZ = aabb.minZ;
    if (aabb.maxZ > maxZ) maxZ = aabb.maxZ;
  }

  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = Math.round((maxX - minX) / 0.08);
  const d = Math.round((maxZ - minZ) / 0.08);

  return { cx, cz, w, d };
};

export const doAABBsOverlap = (
  a: AABB,
  b: AABB,
  epsilon: number = PLACEMENT_EPSILON,
) => {
  return (
    a.minX < b.maxX - epsilon &&
    a.maxX > b.minX + epsilon &&
    a.minZ < b.maxZ - epsilon &&
    a.maxZ > b.minZ + epsilon
  );
};

export const checkPlacementValid = (
  bricks: Omit<BrickData, "color">[],
  ghostData: Omit<BrickData, "color">,
  moduleSize: number,
  brickHeight: number,
  epsilon: number = PLACEMENT_EPSILON,
  ignoreBrickId?: string,
) => {
  const ghostAABB = getBrickAABB(ghostData);

  // MUST NOT OVERLAP
  const isOverlap = bricks.some((b) => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
      return false;
    if (Math.abs(b.position[1] - ghostData.position[1]) > epsilon) return false;
    const bAABB = getBrickAABB(b);
    return doAABBsOverlap(ghostAABB, bAABB);
  });

  if (isOverlap) return { valid: false, reason: "overlap" };

  // Ground check
  if (ghostData.position[1] <= epsilon)
    return { valid: true, reason: "grounded" };

  // Connection check (Support from below or connected to existing)
  const isSupported = bricks.some((b) => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
      return false;

    return areBricksConnected(ghostData as BrickData, b as BrickData);
  });

  return isSupported
    ? { valid: true, reason: "supported" }
    : { valid: false, reason: "floating" };
};

export const hasBrickAbove = (
  brick: Omit<BrickData, "color">,
  bricks: Omit<BrickData, "color">[],
  moduleSize: number,
  brickHeight: number,
  ignoreIds: string[] = [],
  epsilon: number = PLACEMENT_EPSILON,
) => {
  const targetTopY = brick.position[1] + brickHeight;

  // Find bricks exactly one layer above the selected brick
  const bricksDirectlyAbove = bricks.filter(
    (b) =>
      b.id !== brick.id &&
      !ignoreIds.includes(b.id) &&
      Math.abs(b.position[1] - targetTopY) < epsilon,
  );

  const targetAABB = getBrickAABB(brick);

  for (const b of bricksDirectlyAbove) {
    const bAABB = getBrickAABB(b);
    if (doAABBsOverlap(targetAABB, bAABB)) {
      return true;
    }
  }

  return false;
};

export const checkStructureValid = (
  bricks: Omit<BrickData, "color">[],
  presetBricks: Omit<BrickData, "color">[],
  moduleSize: number,
  brickHeight: number,
  epsilon: number = PLACEMENT_EPSILON,
  presetName?: string,
): { valid: boolean; reason?: string } => {
  if (presetBricks.length === 0)
    return { valid: false, reason: "empty preset" };

  for (const pb of presetBricks) {
    const pbAABB = getBrickAABB(pb);

    // Check overlap with existing bricks
    const hasWorldOverlap = bricks.some(
      (b) =>
        Math.abs(b.position[1] - pb.position[1]) < epsilon &&
        doAABBsOverlap(pbAABB, getBrickAABB(b)),
    );
    if (hasWorldOverlap) return { valid: false, reason: "overlap" };

    // Check overlap with other preset bricks
    const hasInternalOverlap = presetBricks.some(
      (otherPb) =>
        otherPb.id !== pb.id &&
        Math.abs(otherPb.position[1] - pb.position[1]) < epsilon &&
        doAABBsOverlap(pbAABB, getBrickAABB(otherPb)),
    );
    if (hasInternalOverlap) {
      return { valid: false, reason: "overlap" };
    }

    // Check support
    if (pb.position[1] > epsilon) {
      const isSupported = [...bricks, ...presetBricks].some((b) => {
        if (b.id === pb.id) return false;
        return areBricksConnected(pb as BrickData, b as BrickData);
      });
      if (!isSupported) {
        return { valid: false, reason: "unsupported" };
      }
    }
  }

  return { valid: true };
};

export type PresetName =
  | "tree"
  | "cabin"
  | "round_water_well"
  | "pine_tree"
  | "walk_in_castle"
  | "horse"
  | "sheep"
  | "car"
  | "road"
  | "mountain";
export type ActivePresetName = PresetName | "clipboard";
export type AppMode = "Build" | "Move" | "Delete";
export type CameraMode = "Orbit" | "Pan" | "Zoom";

interface HistoryState {
  bricks: BrickData[];
}

interface LegoStore {
  bricks: BrickData[];
  mode: AppMode;
  cameraMode: CameraMode;
  selectedType: BrickType;
  selectedColor: string;
  undoStack: HistoryState[];
  redoStack: HistoryState[];
  toastMessage: string | null;
  movingBrickId: string | null;
  isDraggingBrick: boolean;

  justSelectedBrick: boolean;
  setJustSelectedBrick: (val: boolean) => void;

  isCameraLocked: boolean;
  setIsCameraLocked: (locked: boolean) => void;
  selectionMode: "Solo" | "Multi" | "Group";
  setSelectionMode: (mode: "Solo" | "Multi" | "Group") => void;
  multiSelectedBrickIds: string[];
  setMultiSelectedBrickIds: (ids: string[]) => void;
  toggleMultiSelectBrickId: (id: string) => void;
  clipboardBricks: BrickData[];
  setClipboardBricks: (bricks: BrickData[]) => void;

  // VR Locomotion Settings
  snapTurnAngle: number;
  setSnapTurnAngle: (angle: number) => void;
  movementSpeed: number;
  setMovementSpeed: (speed: number) => void;
  locomotionMode: "Stationary" | "Smooth";
  setLocomotionMode: (mode: "Stationary" | "Smooth") => void;

  // VR Tools Settings
  showXRPerf: boolean;
  setShowXRPerf: (show: boolean) => void;
  xrPanel: "none" | "waitingControllers" | "onboarding" | "buildMenu" | "palette" | "error";
  setXRPanel: (panel: "none" | "waitingControllers" | "onboarding" | "buildMenu" | "palette" | "error") => void;
  closeXRPanel: () => void;

  // Event Triggers
  rotateGhostTrigger: number;
  triggerRotateGhost: () => void;
  cameraZoomTrigger: number;
  cameraZoomDirection: "in" | "out" | null;
  triggerCameraZoom: (direction: "in" | "out") => void;
  cameraRecenterTrigger: number;
  triggerCameraRecenter: () => void;
  screenshotTrigger: number;
  triggerScreenshot: () => void;

  vrControllerActionTrigger: number;
  vrControllerActionDetail: {
    type: string;
    action?: string;
    point?: any;
    normal?: any;
    targetKind?: string;
  } | null;
  triggerVRControllerAction: (detail: {
    type: string;
    action?: string;
    point?: any;
    normal?: any;
    targetKind?: string;
  }) => void;

  vrMenuHoverContent: string | null;
  setVRMenuHoverContent: (content: string | null) => void;

  vrRecenterTrigger: number;
  triggerVRRecenter: () => void;

  ghostPosTrigger: number;
  ghostPosData: [number, number, number] | null;
  triggerSetGhostPosition: (pos: [number, number, number]) => void;

  ghostRotTrigger: number;
  ghostRotData: number | null;
  triggerSetGhostRotation: (rot: number) => void;

  // Actions
  addBrick: (brick: Omit<BrickData, "id">) => void;
  removeBrick: (id: string) => void;
  removeBricks: (ids: string[]) => void;
  updateBrick: (id: string, updates: Partial<BrickData>) => void;
  updateBricks: (
    updates: { id: string; updates: Partial<BrickData> }[],
  ) => void;
  setMode: (mode: AppMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSelectedType: (type: BrickType) => void;
  setSelectedColor: (color: string) => void;
  setToastMessage: (msg: string | null) => void;
  setMovingBrickId: (id: string | null) => void;
  setIsDraggingBrick: (val: boolean) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  setBricks: (bricks: BrickData[]) => void;
  loadPreset: (presetName: ActivePresetName | null) => void;
  commitPreset: (position: [number, number, number], rotation: number) => void;
  activePreset: ActivePresetName | null;
  toastTimeoutId: ReturnType<typeof setTimeout> | null;
  exportGLB: (() => void) | null;
  setExportGLB: (fn: (() => void) | null) => void;
}

const COLORS = [
  "#E3000B", // Red
  "#0055BF", // Blue
  "#FFD500", // Yellow
  "#FFFFFF", // White
  "#000000", // Black
  "#00AD3C", // Green
  "#8B4513", // Wood/Brown
  "#9CA3AF", // Grey
];

const ms = MODULE_SIZE;
const bh = BRICK_HEIGHT;

const createBrick = (
  type: BrickType,
  color: string,
  px: number,
  py: number,
  pz: number,
  rotation: number = 0,
): BrickData => ({
  id: crypto.randomUUID(),
  type,
  color,
  position: [px * ms, py * bh, pz * ms],
  rotation,
});

const generateLifeSizedTree = (): BrickData[] => {
  const tree: BrickData[] = [];
  const trunk = "#8B4513";
  const leaf = "#00AD3C";
  // Trunk
  for (let y = 0; y < 3; y++) tree.push(createBrick("2x2", trunk, 0.5, y, 0.5));
  // Branches & Leaves - alternating 2x4s to make a canopy
  tree.push(createBrick("2x4", leaf, 0.5, 3, 0.5, 0));
  tree.push(createBrick("2x4", leaf, 0.5, 4, 0.5, 90));
  tree.push(createBrick("2x4", leaf, 0.5, 5, 0.5, 0));
  tree.push(createBrick("2x2", leaf, 0.5, 6, 0.5));
  return tree;
};

const generateLifeSizedCabin = (): BrickData[] => {
  const cabin: BrickData[] = [];
  const brown = "#8B4513";
  const roof = "#3b2f2f";
  // Walls
  for (let y = 0; y < 3; y++) {
    // left wall (span Z: -1.5 to 2.5)
    cabin.push(createBrick("2x4", brown, -2.5, y, 0.5, 0));
    // right wall
    cabin.push(createBrick("2x4", brown, 2.5, y, 0.5, 0));
    // back wall (span X: -1.5 to 1.5)
    cabin.push(createBrick("2x2", brown, -0.5, y, -2.5, 0));
    cabin.push(createBrick("1x2", brown, 1.5, y, -2.5, 90));
    // front wall with door (gap at X=0.5)
    if (y > 1) {
      cabin.push(createBrick("1x2", brown, -0.5, y, 2.5, 90));
    } else {
      // pillar for the side of the door
      cabin.push(createBrick("1x1", brown, -0.5, y, 2.5, 0));
    }
  }
  // Roof - span X: -2.5 to 2.5, Z: -2.5 to 2.5
  // Left half roof
  cabin.push(createBrick("2x4", roof, -1.5, 3, 0.5, 0));
  // Right half roof
  cabin.push(createBrick("2x4", roof, 1.5, 3, 0.5, 0));
  // Back roof gap
  cabin.push(createBrick("1x2", roof, -1.5, 3, -2.5, 90));
  cabin.push(createBrick("1x2", roof, 1.5, 3, -2.5, 90));
  // Front roof gap
  cabin.push(createBrick("1x2", roof, -1.5, 3, 2.5, 90));
  cabin.push(createBrick("1x2", roof, 1.5, 3, 2.5, 90));

  // Top roof
  cabin.push(createBrick("2x4", roof, 0.5, 4, 0.5, 0));
  return cabin;
};

const generateRoundWaterWell = (): BrickData[] => {
  const well: BrickData[] = [];
  const stone = "#A0A0A0";
  const blue = "#0055BF";
  const brown = "#8B4513";
  // Base
  for (let y = 0; y < 2; y++) {
    well.push(createBrick("2x4", stone, -1.5, y, 0.5, 0)); // Left wall
    well.push(createBrick("2x4", stone, 2.5, y, 0.5, 0)); // Right wall
    well.push(createBrick("2x2", stone, 0.5, y, -0.5, 0)); // Back
    well.push(createBrick("2x2", stone, 0.5, y, 1.5, 0)); // Front
  }
  well.push(createBrick("1x1", blue, 0.5, 0, 0.5));
  // Pillars
  well.push(createBrick("1x1", brown, -1.5, 2, 0.5));
  well.push(createBrick("1x1", brown, 2.5, 2, 0.5));
  well.push(createBrick("1x1", brown, -1.5, 3, 0.5));
  well.push(createBrick("1x1", brown, 2.5, 3, 0.5));
  // Roof bridging the pillars
  well.push(createBrick("2x4", brown, 0.5, 4, 0.5, 90));
  return well;
};

const generatePineTree = (): BrickData[] => {
  const tree: BrickData[] = [];
  const brown = "#8B4513";
  const green = "#00AD3C";
  tree.push(createBrick("1x1", brown, 0.5, 0, 0.5));
  tree.push(createBrick("1x1", brown, 0.5, 1, 0.5));

  tree.push(createBrick("2x2", green, -0.5, 2, -0.5));
  tree.push(createBrick("2x2", green, 1.5, 2, -0.5));
  tree.push(createBrick("2x2", green, -0.5, 2, 1.5));
  tree.push(createBrick("2x2", green, 1.5, 2, 1.5));

  tree.push(createBrick("2x2", green, 0.5, 3, 0.5));
  tree.push(createBrick("1x1", green, 0.5, 4, 0.5));
  return tree;
};

const generateWalkInCastle = (): BrickData[] => {
  const castle: BrickData[] = [];
  const stone = "#A0A0A0";
  // Walls
  for (let y = 0; y < 3; y++) {
    castle.push(createBrick("2x4", stone, -2.5, y, 0.5, 90));
    castle.push(createBrick("2x4", stone, 3.5, y, 0.5, 90));
    castle.push(createBrick("2x4", stone, 0.5, y, -2.5, 0));
    if (y > 1) {
      castle.push(createBrick("2x2", stone, 0.5, y, 3.5, 0)); // Door gap
    } else {
      castle.push(createBrick("1x2", stone, -1.5, y, 3.5, 0));
      castle.push(createBrick("1x2", stone, 2.5, y, 3.5, 0));
    }
  }
  // Towers
  const corners = [
    [-2.5, -2.5],
    [3.5, -2.5],
    [-2.5, 3.5],
    [3.5, 3.5],
  ];
  corners.forEach(([cx, cz]) => {
    for (let y = 0; y < 5; y++)
      castle.push(createBrick("1x1", stone, cx, y, cz));
  });
  return castle;
};

const generateHorse = (): BrickData[] => {
  const horse: BrickData[] = [];
  const brown = "#8B4513";
  // Legs
  horse.push(createBrick("1x1", brown, -0.5, 0, -1.5));
  horse.push(createBrick("1x1", brown, 1.5, 0, -1.5));
  horse.push(createBrick("1x1", brown, -0.5, 0, 1.5));
  horse.push(createBrick("1x1", brown, 1.5, 0, 1.5));
  // Body (X: -1.5 to 2.5, Z: -2.5 to 2.5) -> Wait, W=4, D=4?
  // Let's use two 2x4s side by side so it spans X: [-0.5, 1.5], Z: [-1.5, 2.5]
  // 2x4 rot 0: X goes -0.5 to 1.5, Z goes -1.5 to 2.5. Fits all 4 legs!
  horse.push(createBrick("2x4", brown, 0.5, 1, 0.5, 0));
  // Neck & Head
  horse.push(createBrick("1x1", brown, 0.5, 2, 1.5));
  horse.push(createBrick("1x2", brown, 0.5, 3, 2.5, 0)); // No rotation
  return horse;
};

const generateSheep = (): BrickData[] => {
  const sheep: BrickData[] = [];
  const white = "#FFFFFF";
  const black = "#000000";
  // Legs
  sheep.push(createBrick("1x1", black, -0.5, 0, -1.5));
  sheep.push(createBrick("1x1", black, 1.5, 0, -1.5));
  sheep.push(createBrick("1x1", black, -0.5, 0, 1.5));
  sheep.push(createBrick("1x1", black, 1.5, 0, 1.5));
  // Body
  sheep.push(createBrick("2x4", white, 0.5, 1, 0.5, 0)); // Rot 0
  // Head
  sheep.push(createBrick("1x1", black, 0.5, 2, 1.5));
  return sheep;
};

const generateCar = (): BrickData[] => {
  const car: BrickData[] = [];
  const red = "#E3000B";
  const black = "#000000";
  const white = "#FFFFFF";
  // Chassis
  car.push(createBrick("2x4", red, 0.5, 1, 0.5, 0));
  car.push(createBrick("2x4", red, 0.5, 2, 0.5, 0));
  // Wheels
  car.push(createBrick("1x1", black, -0.5, 0, -1.5));
  car.push(createBrick("1x1", black, 1.5, 0, -1.5));
  car.push(createBrick("1x1", black, -0.5, 0, 1.5));
  car.push(createBrick("1x1", black, 1.5, 0, 1.5));
  // Cabin
  car.push(createBrick("2x2", white, 0.5, 3, 0.5, 0));
  car.push(createBrick("2x2", red, 0.5, 4, 0.5, 0));
  return car;
};

const generateRoad = (): BrickData[] => {
  const road: BrickData[] = [];
  const gray = "#707070";
  const yellow = "#FFD500";
  for (let z = -4.5; z <= 4.5; z += 2) {
    road.push(createBrick("2x4", gray, -2.5, 0, z, 90));
    road.push(createBrick("2x4", gray, 3.5, 0, z, 90));
    if (Math.abs(z) % 4 < 1)
      road.push(createBrick("1x2", yellow, 0.5, 0, z, 90));
    else road.push(createBrick("1x2", gray, 0.5, 0, z, 90));
  }
  return road;
};

const generateMountain = (): BrickData[] => {
  const mtn: BrickData[] = [];
  const gray = "#A0A0A0";
  const white = "#FFFFFF";
  const green = "#00AD3C";

  // Base
  mtn.push(createBrick("2x4", green, -1.5, 0, 0.5, 0));
  mtn.push(createBrick("2x4", green, 2.5, 0, 0.5, 0));
  // L2
  mtn.push(createBrick("2x4", gray, 0.5, 1, 0.5, 90));
  // L3
  mtn.push(createBrick("2x2", gray, 0.5, 2, 0.5, 0));
  // L4
  mtn.push(createBrick("1x1", white, 0.5, 3, 0.5, 0));

  return mtn;
};

const MAX_HISTORY = 50;
const pushHistory = (stack: HistoryState[], bricks: BrickData[]) => {
  const newStack = [...stack, { bricks: [...bricks] }];
  if (newStack.length > MAX_HISTORY) {
    return newStack.slice(newStack.length - MAX_HISTORY);
  }
  return newStack;
};

export const PRESETS: Record<PresetName, BrickData[]> = {
  horse: generateHorse(),
  sheep: generateSheep(),
  car: generateCar(),
  road: generateRoad(),
  mountain: generateMountain(),
  tree: generateLifeSizedTree(),
  cabin: generateLifeSizedCabin(),
  round_water_well: generateRoundWaterWell(),
  pine_tree: generatePineTree(),
  walk_in_castle: generateWalkInCastle(),
};

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingBricks: BrickData[] | null = null;

const flushSave = () => {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_pendingBricks !== null) {
    localStorage.setItem("brickxr-save", JSON.stringify(_pendingBricks));
    _pendingBricks = null;
  }
};

const scheduleSave = (bricks: BrickData[], immediate: boolean = false) => {
  _pendingBricks = bricks;
  if (immediate) {
    flushSave();
    return;
  }
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    flushSave();
  }, 500);
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSave();
    }
  });
}

export const useLegoStore = create<LegoStore>((set, get) => ({
  bricks: [],
  mode: "Build",
  cameraMode: "Orbit",
  selectedType: "2x2",
  selectedColor: COLORS[0],
  activePreset: null,
  undoStack: [],
  redoStack: [],
  toastMessage: null,
  toastTimeoutId: null,
  movingBrickId: null,
  isDraggingBrick: false,
  justSelectedBrick: false,
  clipboardBricks: [],
  setClipboardBricks: (bricks) => set({ clipboardBricks: bricks }),
  isCameraLocked: false,

  snapTurnAngle: 45,
  setSnapTurnAngle: (snapTurnAngle) => set({ snapTurnAngle }),
  movementSpeed: 1.5,
  setMovementSpeed: (movementSpeed) => set({ movementSpeed }),
  locomotionMode: "Smooth",
  setLocomotionMode: (locomotionMode) => set({ locomotionMode }),

  showXRPerf: false,
  setShowXRPerf: (showXRPerf) => set({ showXRPerf }),
  xrPanel: "none",
  setXRPanel: (panel) => set({ xrPanel: panel }),
  closeXRPanel: () => set({ xrPanel: "none" }),

  // Event Triggers
  rotateGhostTrigger: 0,
  triggerRotateGhost: () =>
    set((state) => ({ rotateGhostTrigger: state.rotateGhostTrigger + 1 })),
  cameraZoomTrigger: 0,
  cameraZoomDirection: null,
  triggerCameraZoom: (direction) =>
    set((state) => ({
      cameraZoomTrigger: state.cameraZoomTrigger + 1,
      cameraZoomDirection: direction,
    })),
  cameraRecenterTrigger: 0,
  triggerCameraRecenter: () =>
    set((state) => ({
      cameraRecenterTrigger: state.cameraRecenterTrigger + 1,
    })),
  screenshotTrigger: 0,
  triggerScreenshot: () =>
    set((state) => ({ screenshotTrigger: state.screenshotTrigger + 1 })),

  vrControllerActionTrigger: 0,
  vrControllerActionDetail: null,
  triggerVRControllerAction: (detail) =>
    set((state) => ({
      vrControllerActionTrigger: state.vrControllerActionTrigger + 1,
      vrControllerActionDetail: detail,
    })),

  vrMenuHoverContent: null,
  setVRMenuHoverContent: (content: string | null) =>
    set({ vrMenuHoverContent: content }),

  vrRecenterTrigger: 0,
  triggerVRRecenter: () =>
    set((state) => ({ vrRecenterTrigger: state.vrRecenterTrigger + 1 })),

  ghostPosTrigger: 0,
  ghostPosData: null,
  triggerSetGhostPosition: (pos: [number, number, number]) =>
    set((state) => ({
      ghostPosTrigger: state.ghostPosTrigger + 1,
      ghostPosData: pos,
    })),

  ghostRotTrigger: 0,
  ghostRotData: null,
  triggerSetGhostRotation: (rot: number) =>
    set((state) => ({
      ghostRotTrigger: state.ghostRotTrigger + 1,
      ghostRotData: rot,
    })),

  exportGLB: null,
  setExportGLB: (fn) => set({ exportGLB: fn }),

  setToastMessage: (msg) => {
    const { toastTimeoutId } = get();
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    if (msg) {
      const id = setTimeout(() => {
        set({ toastMessage: null, toastTimeoutId: null });
      }, 3000);
      set({ toastMessage: msg, toastTimeoutId: id });
    } else {
      set({ toastMessage: null, toastTimeoutId: null });
    }
  },
  setMovingBrickId: (id) => set({ movingBrickId: id }),
  setIsDraggingBrick: (val) => set({ isDraggingBrick: val }),
  setJustSelectedBrick: (val) => set({ justSelectedBrick: val }),
  setIsCameraLocked: (val) => set({ isCameraLocked: val }),

  addBrick: (newBrickData) => {
    const { bricks, undoStack } = get();
    const newBrick = { ...newBrickData, id: crypto.randomUUID() };

    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: [...bricks, newBrick],
    });

    // Save to local storage
    scheduleSave([...bricks, newBrick]);
  },

  removeBrick: (id) => {
    const { bricks, undoStack } = get();

    const brickToRemove = bricks.find((b) => b.id === id);
    if (!brickToRemove) return;

    if (hasBrickAbove(brickToRemove, bricks, 0.08, 0.096)) {
      if (typeof window !== "undefined") {
        get().setToastMessage(
          "Cannot delete: brick has another brick above it.",
        );
      }
      return;
    }

    const newBricks = bricks.filter((b) => b.id !== id);

    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: newBricks,
    });

    scheduleSave(newBricks);
  },

  selectionMode: "Solo",
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  multiSelectedBrickIds: [],
  setMultiSelectedBrickIds: (ids) => set({ multiSelectedBrickIds: ids }),
  toggleMultiSelectBrickId: (id) => {
    const ids = get().multiSelectedBrickIds;
    if (ids.includes(id)) {
      set({ multiSelectedBrickIds: ids.filter((x) => x !== id) });
    } else {
      set({ multiSelectedBrickIds: [...ids, id] });
    }
  },

  removeBricks: (ids) => {
    const { bricks, undoStack } = get();
    // Validate if any brick has something above it that isn't also being removed
    const someInvalid = ids.some((id) => {
      const b = bricks.find((x) => x.id === id);
      if (!b) return false;
      return hasBrickAbove(
        b,
        bricks.filter((x) => !ids.includes(x.id)),
        0.08,
        0.096,
      );
    });

    if (someInvalid) {
      if (typeof window !== "undefined") {
        get().setToastMessage(
          "Cannot delete: some bricks have others above them.",
        );
      }
      return;
    }

    const newBricks = bricks.filter((b) => !ids.includes(b.id));
    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: newBricks,
    });
    scheduleSave(newBricks);
  },

  updateBricks: (updates) => {
    const { bricks, undoStack } = get();
    const updateMap = new Map(updates.map((u) => [u.id, u.updates]));
    const newBricks = bricks.map((b) => {
      const up = updateMap.get(b.id);
      return up ? { ...b, ...up } : b;
    });

    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: newBricks,
    });

    scheduleSave(newBricks);
  },

  updateBrick: (id, updates) => {
    const { bricks, undoStack } = get();
    const newBricks = bricks.map((b) =>
      b.id === id ? { ...b, ...updates } : b,
    );

    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: newBricks,
    });

    scheduleSave(newBricks);
  },

  setMode: (mode) =>
    set({
      mode,
      activePreset: null,
      movingBrickId: null,
      isDraggingBrick: false,
      multiSelectedBrickIds: [],
    }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setSelectedType: (selectedType) =>
    set({
      selectedType,
      activePreset: null,
      movingBrickId: null,
      isDraggingBrick: false,
      multiSelectedBrickIds: [],
    }),
  setSelectedColor: (selectedColor) => {
    const {
      mode,
      movingBrickId,
      multiSelectedBrickIds,
      bricks,
      updateBricks,
      selectionMode,
    } = get();
    set({ selectedColor });

    if (mode === "Move") {
      let didRecolor = false;
      if (selectionMode === "Multi" && multiSelectedBrickIds.length > 0) {
        const updates = multiSelectedBrickIds.map((id) => ({
          id: id,
          updates: { color: selectedColor },
        }));
        updateBricks(updates);
        didRecolor = true;
      } else if (movingBrickId) {
        const movingBrick = bricks.find((b) => b.id === movingBrickId);
        if (movingBrick) {
          if (selectionMode === "Group") {
            const groupBricks = getGroupBricks(movingBrick, bricks);
            const updates = groupBricks.map((b) => ({
              id: b.id,
              updates: { color: selectedColor },
            }));
            updateBricks(updates);
            didRecolor = true;
          } else {
            updateBricks([
              { id: movingBrick.id, updates: { color: selectedColor } },
            ]);
            didRecolor = true;
          }
        }
      }
      if (didRecolor && typeof window !== "undefined") {
        get().setToastMessage("Selected brick recolored.");
      }
    }
  },

  undo: () => {
    const { bricks, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const prevState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({
      undoStack: newUndoStack,
      redoStack: pushHistory(redoStack, bricks),
      bricks: prevState.bricks,
      movingBrickId: null,
      isDraggingBrick: false,
      multiSelectedBrickIds: [],
      justSelectedBrick: false,
    });

    scheduleSave(prevState.bricks);
  },

  redo: () => {
    const { bricks, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: newRedoStack,
      bricks: nextState.bricks,
      movingBrickId: null,
      isDraggingBrick: false,
      multiSelectedBrickIds: [],
      justSelectedBrick: false,
    });

    scheduleSave(nextState.bricks);
  },

  clearAll: () => {
    const { bricks, undoStack } = get();
    set({
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: [],
    });
    scheduleSave([], true);
  },

  setBricks: (newBricks) => {
    set({ bricks: newBricks, undoStack: [], redoStack: [] });
    scheduleSave(newBricks, true);
  },

  loadPreset: (presetName) => {
    set({ activePreset: presetName, mode: "Build" });
  },

  commitPreset: (position, rotation = 0) => {
    const { activePreset, bricks, undoStack, clipboardBricks } = get();
    if (!activePreset) return;

    const presetSource = getActivePresetBricks(activePreset, clipboardBricks);
    if (!presetSource) return;

    const validPresetBricks = presetSource.filter((b) => {
      const valid = isValidBrickData(b);
      if (!valid)
        console.warn(`Malformed brick found in preset ${activePreset}:`, b);
      return valid;
    });

    const info = getPresetInfo(activePreset, clipboardBricks);

    const groupId = crypto.randomUUID();
    const presetBricks = validPresetBricks.map((b) => {
      let ox = b.position[0] - info.cx;
      let oz = b.position[2] - info.cz;
      let nx = ox,
        nz = oz;

      const rotMod = (Math.round(rotation / 90) * 90) % 360;
      if (rotMod === 90 || rotMod === -270) {
        nx = -oz;
        nz = ox;
      } else if (Math.abs(rotMod) === 180) {
        nx = -ox;
        nz = -oz;
      } else if (rotMod === 270 || rotMod === -90) {
        nx = oz;
        nz = -ox;
      }

      return {
        ...b,
        id: crypto.randomUUID(),
        groupId,
        rotation: ((b.rotation || 0) + rotMod) % 360,
        position: [
          nx + position[0],
          b.position[1] + position[1],
          nz + position[2],
        ] as [number, number, number],
      };
    });

    // STRUCTURE PLACEMENT VALIDATION
    const check = checkStructureValid(
      bricks,
      presetBricks,
      ms,
      bh,
      PLACEMENT_EPSILON,
    );
    if (!check.valid) {
      console.warn("Preset placement blocked:", check.reason);
      return;
    }

    const newBricks = [...bricks, ...presetBricks];
    const updates: Partial<LegoStore> = {
      undoStack: pushHistory(undoStack, bricks),
      redoStack: [],
      bricks: newBricks,
    };

    if (activePreset === "clipboard") {
      updates.activePreset = null;
      updates.mode = "Move";
      updates.selectionMode = "Multi";
      updates.multiSelectedBrickIds = presetBricks.map((b) => b.id);
    }

    set(updates);
    scheduleSave(newBricks);
  },
}));

export const LEGO_COLORS = COLORS;
