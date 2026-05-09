import { create } from "zustand";

export type BrickType = "1x1" | "1x2" | "2x2" | "2x3" | "2x4";
export const BRICK_TYPES: BrickType[] = ["1x1", "1x2", "2x2", "2x3", "2x4"];

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

  if (dy > 0.096 + 0.001) return false; // BRICK_HEIGHT

  if (dy < 0.001) {
    const touchX =
      Math.abs(a1.maxX - a2.minX) < 0.001 ||
      Math.abs(a2.maxX - a1.minX) < 0.001;
    const touchZ =
      Math.abs(a1.maxZ - a2.minZ) < 0.001 ||
      Math.abs(a2.maxZ - a1.minZ) < 0.001;
    return (
      (overlapX > 0.001 && touchZ) ||
      (overlapZ > 0.001 && touchX) ||
      (overlapX > 0.001 && overlapZ > 0.001)
    );
  } else {
    return overlapX > 0.001 && overlapZ > 0.001;
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
    case "1x1":
      return { w: 1, d: 1 };
    case "1x2":
      return { w: 1, d: 2 };
    case "2x2":
      return { w: 2, d: 2 };
    case "2x3":
      return { w: 2, d: 3 };
    case "2x4":
      return { w: 2, d: 4 };
    default:
      return { w: 1, d: 1 };
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

export const doAABBsOverlap = (a: AABB, b: AABB, epsilon: number = 0.001) => {
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
  epsilon: number = 0.01,
  ignoreBrickId?: string,
) => {
  const ghostAABB = getBrickAABB(ghostData);

  // MUST NOT OVERLAP
  const isOverlap = bricks.some((b) => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
      return false;
    if (Math.abs(b.position[1] - ghostData.position[1]) > epsilon) return false;
    const bAABB = getBrickAABB(b);
    return doAABBsOverlap(ghostAABB, bAABB, 0.001);
  });

  if (isOverlap) return { valid: false, reason: "overlap" };

  // Ground check
  if (ghostData.position[1] <= epsilon)
    return { valid: true, reason: "grounded" };

  // Connection check (Support from below)
  const isSupported = bricks.some((b) => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
      return false;

    const dy = ghostData.position[1] - b.position[1];
    if (Math.abs(dy - brickHeight) < epsilon) {
      const bAABB = getBrickAABB(b);
      return doAABBsOverlap(ghostAABB, bAABB, 0.001);
    }
    return false;
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
  epsilon: number = 0.01,
) => {
  const targetTopY = brick.position[1] + brickHeight;

  // 1. Find bricks exactly one layer above the selected brick
  const bricksDirectlyAbove = bricks.filter(
    (b) => Math.abs(b.position[1] - targetTopY) < epsilon,
  );

  const targetAABB = getBrickAABB(brick);

  for (const b of bricksDirectlyAbove) {
    const bAABB = getBrickAABB(b);

    // 2. Do they truly overlap?
    if (doAABBsOverlap(targetAABB, bAABB, 0.001)) {
      // 3. Check if removing selected brick removes the other brick's valid support
      const otherSupports = bricks.filter(
        (other) =>
          other.id !== brick.id &&
          other.id !== b.id &&
          Math.abs(other.position[1] - brick.position[1]) < epsilon,
      );

      let hasAlternateSupport = false;
      for (const other of otherSupports) {
        if (doAABBsOverlap(bAABB, getBrickAABB(other), 0.001)) {
          hasAlternateSupport = true;
          break;
        }
      }

      if (!hasAlternateSupport) {
        return true;
      }
    }
  }

  return false;
};

export const checkStructureValid = (
  bricks: Omit<BrickData, "color">[],
  presetBricks: Omit<BrickData, "color">[],
  moduleSize: number,
  brickHeight: number,
  epsilon: number = 0.01,
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
        doAABBsOverlap(pbAABB, getBrickAABB(b), 0.001),
    );
    if (hasWorldOverlap) return { valid: false, reason: "overlap" };

    // Check overlap with other preset bricks
    const hasInternalOverlap = presetBricks.some(
      (otherPb) =>
        otherPb.id !== pb.id &&
        Math.abs(otherPb.position[1] - pb.position[1]) < epsilon &&
        doAABBsOverlap(pbAABB, getBrickAABB(otherPb), 0.001),
    );
    if (hasInternalOverlap) {
      return { valid: false, reason: "overlap" };
    }

    // Check support
    if (pb.position[1] > epsilon) {
      const isSupported = [...bricks, ...presetBricks].some((b) => {
        if (b.id === pb.id) return false;
        const dy = pb.position[1] - b.position[1];
        if (Math.abs(dy - brickHeight) < epsilon) {
          return doAABBsOverlap(pbAABB, getBrickAABB(b), 0.001);
        }
        return false;
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
  | "mountain"
  | "_clipboard";
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
  loadPreset: (presetName: PresetName | null) => void;
  commitPreset: (position: [number, number, number], rotation: number) => void;
  activePreset: PresetName | null;
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

// Presets using accurate sizing
const ms = 0.08; // MODULE_SIZE
const bh = 0.096; // BRICK_HEIGHT

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
  _clipboard: [],
};

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
  movingBrickId: null,
  isDraggingBrick: false,
  justSelectedBrick: false,
  isCameraLocked: false,

  setToastMessage: (msg) => set({ toastMessage: msg }),
  setMovingBrickId: (id) => set({ movingBrickId: id }),
  setIsDraggingBrick: (val) => set({ isDraggingBrick: val }),
  setJustSelectedBrick: (val) => set({ justSelectedBrick: val }),
  setIsCameraLocked: (val) => set({ isCameraLocked: val }),

  addBrick: (newBrickData) => {
    const { bricks, undoStack } = get();
    const newBrick = { ...newBrickData, id: crypto.randomUUID() };

    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: [...bricks, newBrick],
    });

    // Save to local storage
    localStorage.setItem("brickxr-save", JSON.stringify([...bricks, newBrick]));
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
        setTimeout(() => {
          if (
            get().toastMessage ===
            "Cannot delete: brick has another brick above it."
          ) {
            get().setToastMessage(null);
          }
        }, 3000);
      }
      return;
    }

    const newBricks = bricks.filter((b) => b.id !== id);

    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });

    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
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
        setTimeout(() => get().setToastMessage(null), 3000);
      }
      return;
    }

    const newBricks = bricks.filter((b) => !ids.includes(b.id));
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });
    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
  },

  updateBricks: (updates) => {
    const { bricks, undoStack } = get();
    const updateMap = new Map(updates.map((u) => [u.id, u.updates]));
    const newBricks = bricks.map((b) => {
      const up = updateMap.get(b.id);
      return up ? { ...b, ...up } : b;
    });

    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });

    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
  },

  updateBrick: (id, updates) => {
    const { bricks, undoStack } = get();
    const newBricks = bricks.map((b) =>
      b.id === id ? { ...b, ...updates } : b,
    );

    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });

    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
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

    if (mode === "Move" || mode === "Delete") {
      if (selectionMode === "Multi" && multiSelectedBrickIds.length > 0) {
        const updates = multiSelectedBrickIds.map((id) => ({
          id: id,
          updates: { color: selectedColor },
        }));
        updateBricks(updates);
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
          } else {
            updateBricks([
              { id: movingBrick.id, updates: { color: selectedColor } },
            ]);
          }
        }
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
      redoStack: [...redoStack, { bricks: [...bricks] }],
      bricks: prevState.bricks,
    });

    localStorage.setItem("brickxr-save", JSON.stringify(prevState.bricks));
  },

  redo: () => {
    const { bricks, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: newRedoStack,
      bricks: nextState.bricks,
    });

    localStorage.setItem("brickxr-save", JSON.stringify(nextState.bricks));
  },

  clearAll: () => {
    const { bricks, undoStack } = get();
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: [],
    });
    localStorage.removeItem("brickxr-save");
  },

  setBricks: (newBricks) => {
    set({ bricks: newBricks, undoStack: [], redoStack: [] });
    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
  },

  loadPreset: (presetName) => {
    set({ activePreset: presetName, mode: "Build" });
  },

  commitPreset: (position, rotation = 0) => {
    const { activePreset, bricks, undoStack } = get();
    if (!activePreset) return;

    const validPresetBricks = PRESETS[activePreset].filter((b) => {
      const valid = isValidBrickData(b);
      if (!valid)
        console.warn(`Malformed brick found in preset ${activePreset}:`, b);
      return valid;
    });

    const groupId = crypto.randomUUID();
    const presetBricks = validPresetBricks.map((b) => {
      let ox = b.position[0];
      let oz = b.position[2];
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
    const check = checkStructureValid(bricks, presetBricks, ms, bh, 0.01);
    if (!check.valid) {
      console.warn("Preset placement blocked:", check.reason);
      return;
    }

    const newBricks = [...bricks, ...presetBricks];
    const updates: Partial<LegoStore> = {
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    };
    
    if (activePreset === "_clipboard") {
      updates.activePreset = null;
      updates.mode = "Move";
      updates.selectionMode = "Multi";
      updates.multiSelectedBrickIds = presetBricks.map(b => b.id);
    }

    set(updates);
    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
  },
}));

export const LEGO_COLORS = COLORS;
