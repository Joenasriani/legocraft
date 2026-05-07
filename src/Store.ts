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
  const dim1 = getBrickDimensions(b1.type);
  const dim2 = getBrickDimensions(b2.type);
  const rot1 = (b1.rotation || 0) % 360;
  const rot2 = (b2.rotation || 0) % 360;

  const w1 = rot1 === 90 || rot1 === 270 ? dim1.d : dim1.w;
  const d1 = rot1 === 90 || rot1 === 270 ? dim1.w : dim1.d;

  const w2 = rot2 === 90 || rot2 === 270 ? dim2.d : dim2.w;
  const d2 = rot2 === 90 || rot2 === 270 ? dim2.w : dim2.d;

  const x1 = b1.position[0];
  const z1 = b1.position[2];
  const x2 = b2.position[0];
  const z2 = b2.position[2];

  const dy = Math.abs(b1.position[1] - b2.position[1]);
  if (dy > 0.096 + 0.001) return false; // BRICK_HEIGHT

  const left1 = x1,
    right1 = x1 + w1 * 0.08,
    top1 = z1,
    bottom1 = z1 + d1 * 0.08;
  const left2 = x2,
    right2 = x2 + w2 * 0.08,
    top2 = z2,
    bottom2 = z2 + d2 * 0.08;

  const overlapX = Math.max(
    0,
    Math.min(right1, right2) - Math.max(left1, left2),
  );
  const overlapZ = Math.max(
    0,
    Math.min(bottom1, bottom2) - Math.max(top1, top2),
  );

  if (dy < 0.001) {
    const touchX =
      Math.abs(right1 - left2) < 0.001 || Math.abs(right2 - left1) < 0.001;
    const touchZ =
      Math.abs(bottom1 - top2) < 0.001 || Math.abs(bottom2 - top1) < 0.001;
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

export const getOccupiedCells = (
  brick: Omit<BrickData, "color">,
  moduleSize: number,
) => {
  const { w, d } = getBrickDimensions(brick.type);
  const rot = Math.round(brick.rotation / 90) % 4; // 0, 1, 2, 3

  // Effective width and depth based on rotation
  const isRotated = rot === 1 || rot === 3 || rot === -1 || rot === -3;
  const ew = isRotated ? d : w;
  const ed = isRotated ? w : d;

  const cells = [];
  const startX = brick.position[0] - (ew - 1) * (moduleSize / 2);
  const startZ = brick.position[2] - (ed - 1) * (moduleSize / 2);

  for (let i = 0; i < ew; i++) {
    for (let j = 0; j < ed; j++) {
      cells.push({
        x: startX + i * moduleSize,
        y: brick.position[1],
        z: startZ + j * moduleSize,
      });
    }
  }
  return cells;
};

export const checkPlacementValid = (
  bricks: Omit<BrickData, "color">[],
  ghostData: Omit<BrickData, "color">,
  moduleSize: number,
  brickHeight: number,
  epsilon: number = 0.01,
  ignoreBrickId?: string,
) => {
  const ghostCells = getOccupiedCells(ghostData, moduleSize);

  // MUST NOT OVERLAP
  const isOverlap = bricks.some((b) => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
      return false;
    if (Math.abs(b.position[1] - ghostData.position[1]) > epsilon) return false;
    const bCells = getOccupiedCells(b, moduleSize);
    return ghostCells.some((gc) =>
      bCells.some(
        (bc) =>
          Math.abs(gc.x - bc.x) < epsilon && Math.abs(gc.z - bc.z) < epsilon,
      ),
    );
  });

  if (isOverlap) return { valid: false, reason: "overlap" };

  // Ground check
  if (ghostData.position[1] <= epsilon)
    return { valid: true, reason: "grounded" };

  // Connection check (Support from below)
  // AT LEAST ONE occupied footprint cell MUST be supported by a brick below
  const isSupported = ghostCells.some((gc) => {
    return bricks.some((b) => {
      if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId))
        return false;

      const dy = ghostData.position[1] - b.position[1];
      if (Math.abs(dy - brickHeight) < epsilon) {
        const bCells = getOccupiedCells(b, moduleSize);
        return bCells.some(
          (bc) =>
            Math.abs(gc.x - bc.x) < epsilon && Math.abs(gc.z - bc.z) < epsilon,
        );
      }
      return false;
    });
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

  const targetCells = getOccupiedCells(brick, moduleSize);

  for (const b of bricksDirectlyAbove) {
    const bCells = getOccupiedCells(b, moduleSize);

    // 2. X/Z occupied cells truly overlap
    const overlappingCells = bCells.filter((bc) =>
      targetCells.some(
        (tc) =>
          Math.abs(bc.x - tc.x) < epsilon && Math.abs(bc.z - tc.z) < epsilon,
      ),
    );

    if (overlappingCells.length > 0) {
      // 3. Check if removing selected brick removes the other brick's valid support
      // Find if `b` is supported by ANY OTHER brick exactly on the same layer as `brick`
      const otherSupports = bricks.filter(
        (other) =>
          other.id !== brick.id &&
          other.id !== b.id &&
          Math.abs(other.position[1] - brick.position[1]) < epsilon,
      );

      let hasAlternateSupport = false;
      for (const other of otherSupports) {
        const otherCells = getOccupiedCells(other, moduleSize);
        const overlapWithOther = bCells.some((bc) =>
          otherCells.some(
            (oc) =>
              Math.abs(bc.x - oc.x) < epsilon &&
              Math.abs(bc.z - oc.z) < epsilon,
          ),
        );
        if (overlapWithOther) {
          hasAlternateSupport = true;
          break;
        }
      }

      console.log(`[Delete Audit] Selected: ${brick.id}, Above: ${b.id}`);
      console.log(`- Overlap cells found: ${overlappingCells.length}`);
      console.log(
        `- Selected Top Y: ${targetTopY.toFixed(3)}, Above Bottom Y: ${b.position[1].toFixed(3)}`,
      );
      console.log(`- Has Alternate Support: ${hasAlternateSupport}`);

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

  const minY = Math.min(...presetBricks.map((b) => b.position[1]));
  const baseBricks = presetBricks.filter((b) => b.position[1] === minY);

  let isValidPlacement = false;
  if (minY <= epsilon) {
    isValidPlacement = true;
  } else {
    isValidPlacement = baseBricks.every((baseBrick) => {
      const dummyValid = checkPlacementValid(
        bricks,
        baseBrick,
        moduleSize,
        brickHeight,
        epsilon,
      );
      return dummyValid.valid;
    });
  }

  if (!isValidPlacement) return { valid: false, reason: "unsupported" };

  const hasOverlap = presetBricks.some((pb) => {
    const dummyValid = checkPlacementValid(
      bricks,
      pb,
      moduleSize,
      brickHeight,
      epsilon,
    );
    return !dummyValid.valid && dummyValid.reason === "overlap";
  });

  if (hasOverlap) return { valid: false, reason: "overlap" };

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

  selectionMode: "Single" | "Group";
  setSelectionMode: (mode: "Single" | "Group") => void;
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
  const trunkColor = "#8B4513";
  const leafColor = "#00AD3C";

  // Trunk: 2x2 centered at 0.5, 0.5
  // Height: ~4m = 42 bricks
  const trunkTopY = 42;
  for (let y = 0; y < trunkTopY; y++) {
    tree.push(createBrick("2x2", trunkColor, 0.5, y, 0.5));
  }

  // Canopy
  for (let y = 20; y <= 55; y++) {
    let radius = 0;
    if (y < 30)
      radius = 3 + (y - 20) * 0.5; // Expanding
    else if (y <= 45)
      radius = 8 - (y - 30) * 0.2; // Wide middle
    else radius = 5 - (y - 45) * 0.5; // Tapering

    const rInt = Math.floor(radius / 2) * 2;
    for (let xOffset = -rInt; xOffset <= rInt; xOffset += 2) {
      for (let zOffset = -rInt; zOffset <= rInt; zOffset += 2) {
        const x = xOffset + 0.5;
        const z = zOffset + 0.5;
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius) {
          if (y < trunkTopY && Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue;
          tree.push(createBrick("2x2", leafColor, x, y, z));
        }
      }
    }
  }
  return tree;
};

const generateLifeSizedCabin = (): BrickData[] => {
  const cabin: BrickData[] = [];
  const brown = "#8B4513";
  const roof = "#3b2f2f";

  // Interior: 40 x 32 modules (3.2m x 2.56m)
  // X: -20.5 to 20.5
  // Z: -16.5 to 16.5

  // Floor (y=0)
  for (let x = -19.5; x <= 19.5; x += 2) {
    for (let z = -14.5; z <= 15.5; z += 4) {
      cabin.push(createBrick("2x4", brown, x, 0, z, 0));
    }
  }

  // Walls (y=1 to 24) (2.3m tall)
  for (let y = 1; y <= 24; y++) {
    // Left and Right Walls
    for (let z = -14.5; z <= 14.5; z += 4) {
      // Windows
      const isWindow = y >= 10 && y <= 16 && Math.abs(z) < 6;
      if (!isWindow) cabin.push(createBrick("2x4", brown, -19.5, y, z, 0));
      if (!isWindow) cabin.push(createBrick("2x4", brown, 19.5, y, z, 0));
    }
    // Back Wall
    for (let x = -17.5; x <= 17.5; x += 4) {
      cabin.push(createBrick("2x4", brown, x, y, -16.5, 90));
    }
    // Front Wall (Door)
    for (let x = -17.5; x <= 17.5; x += 4) {
      // Door gap -5.5 to 5.5 = ~1m wide
      const isDoor = y <= 20 && Math.abs(x) < 6;
      if (!isDoor) cabin.push(createBrick("2x4", brown, x, y, 16.5, 90));
    }
  }

  // Roof (Pitched)
  for (let y = 25; y <= 35; y++) {
    const inset = (y - 24) * 2;
    for (let x = -21.5; x <= 21.5; x += 4) {
      const zOffset = 16.5 - inset;
      if (zOffset > 0) {
        cabin.push(createBrick("2x4", roof, x, y, zOffset, 90));
        cabin.push(createBrick("2x4", roof, x, y, -zOffset, 90));
      } else if (zOffset === 0.5) {
        // Cap
        cabin.push(createBrick("2x4", roof, x, y, 0.5, 90));
      }
    }
  }

  return cabin;
};

const generateRoundWaterWell = (): BrickData[] => {
  const well: BrickData[] = [];
  const stone = "#A0A0A0";
  const darkStone = "#707070";
  const blue = "#0055BF";
  const brown = "#8B4513";

  // Base
  for (let y = 0; y <= 8; y++) {
    const s = y % 2 === 0 ? darkStone : stone;
    // X walls
    well.push(createBrick("2x4", s, -5.5, y, -0.5, 90));
    well.push(createBrick("2x4", s, -5.5, y, 3.5, 90));
    well.push(createBrick("2x4", s, 6.5, y, -0.5, 90));
    well.push(createBrick("2x4", s, 6.5, y, 3.5, 90));
    // Z walls
    well.push(createBrick("2x4", s, -0.5, y, -5.5, 0));
    well.push(createBrick("2x4", s, 3.5, y, -5.5, 0));
    well.push(createBrick("2x4", s, -0.5, y, 6.5, 0));
    well.push(createBrick("2x4", s, 3.5, y, 6.5, 0));

    // Corners
    well.push(createBrick("2x2", s, -4.5, y, -4.5, 0));
    well.push(createBrick("2x2", s, 5.5, y, -4.5, 0));
    well.push(createBrick("2x2", s, -4.5, y, 5.5, 0));
    well.push(createBrick("2x2", s, 5.5, y, 5.5, 0));
  }

  // Water
  for (let x = -2.5; x <= 3.5; x += 2) {
    for (let z = -2.5; z <= 3.5; z += 2) {
      if (Math.abs(x - 0.5) < 4 && Math.abs(z - 0.5) < 4) {
        well.push(createBrick("2x2", blue, x, 6, z, 0));
      }
    }
  }

  // Pillars
  for (let y = 9; y <= 20; y++) {
    well.push(createBrick("2x2", brown, -5.5, y, 0.5, 0));
    well.push(createBrick("2x2", brown, 6.5, y, 0.5, 0));
  }

  // Roof
  for (let x = -7.5; x <= 8.5; x += 2) {
    well.push(createBrick("2x4", brown, x, 21, -1.5, 90));
    well.push(createBrick("2x4", brown, x, 21, 2.5, 90));
    well.push(createBrick("2x2", brown, x, 22, 0.5, 0));
  }

  return well;
};

const generatePineTree = (): BrickData[] => {
  const tree: BrickData[] = [];
  const brown = "#8B4513";
  const green = "#00AD3C";

  // Trunk
  for (let y = 0; y <= 15; y++) {
    tree.push(createBrick("2x2", brown, 0.5, y, 0.5, 0));
  }

  const layers = [
    { startY: 10, radius: 10 },
    { startY: 16, radius: 8 },
    { startY: 22, radius: 6 },
    { startY: 28, radius: 4 },
    { startY: 34, radius: 2 },
  ];

  for (let i = 0; i < layers.length; i++) {
    const cur = layers[i];
    const nextY = i < layers.length - 1 ? layers[i + 1].startY : 40;

    let currentRadius = cur.radius;
    for (let y = cur.startY; y < nextY; y++) {
      const rInt = Math.floor(currentRadius / 2) * 2;
      for (let xOffset = -rInt; xOffset <= rInt; xOffset += 2) {
        for (let zOffset = -rInt; zOffset <= rInt; zOffset += 2) {
          const x = xOffset + 0.5;
          const z = zOffset + 0.5;
          if (
            Math.sqrt(xOffset * xOffset + zOffset * zOffset) <=
            currentRadius + 1
          ) {
            if (Math.abs(x) <= 1.5 && Math.abs(z) <= 1.5 && y <= 15) continue;
            tree.push(createBrick("2x2", green, x, y, z, 0));
          }
        }
      }
      if (y % 2 === 1 && currentRadius > 2) {
        currentRadius -= 1;
      }
    }
  }

  tree.push(createBrick("2x2", green, 0.5, 40, 0.5, 0));

  return tree;
};

const generateWalkInCastle = (): BrickData[] => {
  const castle: BrickData[] = [];
  const stone = "#A0A0A0";
  const darkStone = "#707070";

  // Size: 70 x 70 modules (5.6m x 5.6m)
  // X: -35.5 to 35.5
  // Z: -35.5 to 35.5

  // Left and Right Walls (Z goes from -35.5 to 35.5)
  // y = 0 to 30 (2.8m tall)
  for (let y = 0; y <= 30; y++) {
    for (let z = -30.5; z <= 30.5; z += 4) {
      castle.push(createBrick("2x4", stone, -35.5, y, z, 0));
      castle.push(createBrick("2x4", stone, 35.5, y, z, 0));
    }
  }

  // Back Wall
  for (let y = 0; y <= 30; y++) {
    for (let x = -30.5; x <= 30.5; x += 4) {
      castle.push(createBrick("2x4", stone, x, y, -35.5, 90));
    }
  }

  // Front Wall (with door)
  for (let y = 0; y <= 30; y++) {
    for (let x = -30.5; x <= 30.5; x += 4) {
      // Door gap: -6.5 to 6.5 (13 modules = ~1m wide, 21 bricks = 2m tall)
      if (y <= 21 && Math.abs(x) < 8) continue;
      castle.push(createBrick("2x4", stone, x, y, 35.5, 90));
    }
  }

  // Towers at Corners
  const corners = [
    [-35.5, -35.5],
    [-35.5, 35.5],
    [35.5, -35.5],
    [35.5, 35.5],
  ];
  for (const [cx, cz] of corners) {
    for (let y = 0; y <= 40; y++) {
      const c = y % 4 < 2 ? darkStone : stone;
      castle.push(createBrick("2x2", c, cx - 1, y, cz - 1, 0));
      castle.push(createBrick("2x2", c, cx + 1, y, cz - 1, 0));
      castle.push(createBrick("2x2", c, cx - 1, y, cz + 1, 0));
      castle.push(createBrick("2x2", c, cx + 1, y, cz + 1, 0));
    }
    // Crenellations for towers (y=41)
    castle.push(createBrick("2x2", stone, cx - 1, 41, cz - 1, 0));
    castle.push(createBrick("2x2", stone, cx + 1, 41, cz + 1, 0));
  }

  // Wall Battlements (y=31)
  for (let z = -30.5; z <= 30.5; z += 4) {
    castle.push(createBrick("2x2", stone, -35.5, 31, z, 0));
    castle.push(createBrick("2x2", stone, 35.5, 31, z, 0));
  }
  for (let x = -30.5; x <= 30.5; x += 4) {
    castle.push(createBrick("2x2", stone, x, 31, -35.5, 0));
    castle.push(createBrick("2x2", stone, x, 31, 35.5, 0));
  }

  return castle;
};

const generateHorse = (): BrickData[] => {
  const horse: BrickData[] = [];
  const brown = "#8B4513";
  const black = "#000000";

  // Legs (y=0 to 9)
  for (let y = 0; y < 10; y++) {
    const c = y < 2 ? black : brown; // Hooves
    horse.push(createBrick("2x2", c, -2.5, y, -5.5));
    horse.push(createBrick("2x2", c, 2.5, y, -5.5));
    horse.push(createBrick("2x2", c, -2.5, y, 5.5));
    horse.push(createBrick("2x2", c, 2.5, y, 5.5));
  }

  // Body (y=10 to 14)
  for (let y = 10; y <= 14; y++) {
    for (let x = -2.5; x <= 2.5; x += 4) {
      for (let z = -6.5; z <= 6.5; z += 2) {
        horse.push(createBrick("2x4", brown, x, y, z, 90));
      }
    }
    // Fill middle
    horse.push(createBrick("2x4", brown, 0.5, y, -3.5, 90));
    horse.push(createBrick("2x4", brown, 0.5, y, 0.5, 90));
    horse.push(createBrick("2x4", brown, 0.5, y, 4.5, 90));
  }

  // Neck (y=15 to 20, z=5.5 to 7.5)
  for (let y = 15; y <= 20; y++) {
    horse.push(createBrick("2x4", brown, 0.5, y, 6.5, 90));
  }

  // Head (y=21 to 23)
  for (let y = 21; y <= 23; y++) {
    horse.push(createBrick("2x4", brown, 0.5, y, 6.5, 90));
    horse.push(createBrick("2x4", brown, 0.5, y, 10.5, 90));
  }

  // Eyes and ears
  horse.push(createBrick("1x1", black, -1.5, 22, 6.5));
  horse.push(createBrick("1x1", black, 2.5, 22, 6.5));
  horse.push(createBrick("1x1", brown, -0.5, 24, 5.5));
  horse.push(createBrick("1x1", brown, 1.5, 24, 5.5));

  return horse;
};

const generateSheep = (): BrickData[] => {
  const sheep: BrickData[] = [];
  const white = "#FFFFFF";
  const black = "#000000";

  // Legs (y=0 to 3)
  for (let y = 0; y <= 3; y++) {
    sheep.push(createBrick("1x1", black, -1.5, y, -2.5));
    sheep.push(createBrick("1x1", black, 1.5, y, -2.5));
    sheep.push(createBrick("1x1", black, -1.5, y, 2.5));
    sheep.push(createBrick("1x1", black, 1.5, y, 2.5));
  }

  // Body (y=4 to 8)
  for (let y = 4; y <= 8; y++) {
    for (let x = -1.5; x <= 1.5; x += 2) {
      sheep.push(createBrick("2x4", white, x, y, -1.5, 90));
      sheep.push(createBrick("2x4", white, x, y, 2.5, 90));
    }
  }

  // Head (y=6 to 9, z=4.5)
  for (let y = 6; y <= 9; y++) {
    sheep.push(createBrick("2x2", black, 0, y, 5.5));
  }

  // Fluff on top of head
  sheep.push(createBrick("2x2", white, 0, 10, 5.5));

  return sheep;
};

const generateCar = (): BrickData[] => {
  const car: BrickData[] = [];
  const red = "#E3000B";
  const black = "#000000";
  const white = "#FFFFFF"; // windows / lights
  const gray = "#A0A0A0";

  // Wheels (4 wheels, 2x2 each)
  // front: z=8.5, back: z=-8.5
  for (let y = 0; y <= 2; y++) {
    car.push(createBrick("2x2", black, -5.5, y, -8.5));
    car.push(createBrick("2x2", black, 5.5, y, -8.5));
    car.push(createBrick("2x2", black, -5.5, y, 8.5));
    car.push(createBrick("2x2", black, 5.5, y, 8.5));
  }

  // Chassis base (y=3, y=4)
  for (let y = 3; y <= 5; y++) {
    for (let x = -4.5; x <= 4.5; x += 2) {
      for (let z = -12.5; z <= 12.5; z += 4) {
        car.push(createBrick("2x4", red, x, y, z, 90));
      }
    }
  }

  // Lower body (y=6 to 8)
  for (let y = 6; y <= 8; y++) {
    for (let x = -4.5; x <= 4.5; x += 2) {
      for (let z = -12.5; z <= 12.5; z += 4) {
        car.push(createBrick("2x4", red, x, y, z, 90));
      }
    }
  }

  // Cabin / Windows (y=9 to 13) z from -6.5 to 4.5
  for (let y = 9; y <= 13; y++) {
    for (let x = -4.5; x <= 4.5; x += 2) {
      for (let z = -4.5; z <= 4.5; z += 4) {
        if (Math.abs(x) > 2.5 || z === 4.5 || z === -4.5) {
          car.push(createBrick("2x4", white, x, y, z, 90));
        }
      }
    }
  }

  // Roof (y=14)
  for (let x = -4.5; x <= 4.5; x += 2) {
    for (let z = -4.5; z <= 4.5; z += 4) {
      car.push(createBrick("2x4", red, x, 14, z, 90));
    }
  }

  // Lights
  car.push(createBrick("1x2", white, -3.5, 7, 14.5, 0));
  car.push(createBrick("1x2", white, 3.5, 7, 14.5, 0));

  return car;
};

const generateRoad = (): BrickData[] => {
  const road: BrickData[] = [];
  const gray = "#707070";
  const yellow = "#FFD500";

  const y = 0;
  for (let x = -29.5; x <= 29.5; x += 2) {
    for (let z = -14.5; z <= 14.5; z += 4) {
      if (Math.abs(z) <= 2 && Math.abs(x) % 10 < 4) {
        road.push(createBrick("2x4", yellow, x, y, z, 0));
      } else {
        road.push(createBrick("2x4", gray, x, y, z, 0));
      }
    }
  }
  for (let x = -29.5; x <= 29.5; x += 4) {
    for (let z = -15.5; z <= 15.5; z += 2) {
      if (Math.abs(z) < 15.5) road.push(createBrick("2x4", gray, x, -1, z, 90));
    }
  }

  return road;
};

const generateMountain = (): BrickData[] => {
  const mtn: BrickData[] = [];
  const green = "#00AD3C";
  const gray = "#A0A0A0";
  const white = "#FFFFFF";

  const maxRadius = 30;
  const height = 40;

  for (let y = 0; y < height; y++) {
    const curRadius = maxRadius * (1 - y / height);
    if (curRadius < 1) continue;

    const color = y > 30 ? white : y > 20 ? gray : green;

    const rInt = Math.floor(curRadius / 2) * 2;
    for (let xOffset = -rInt; xOffset <= rInt; xOffset += 4) {
      for (let zOffset = -rInt; zOffset <= rInt; zOffset += 2) {
        if (xOffset * xOffset + zOffset * zOffset <= curRadius * curRadius) {
          mtn.push(
            createBrick("2x4", color, xOffset + 0.5, y, zOffset + 0.5, 0),
          );
        }
      }
    }
  }

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

  setToastMessage: (msg) => set({ toastMessage: msg }),
  setMovingBrickId: (id) => set({ movingBrickId: id }),
  setIsDraggingBrick: (val) => set({ isDraggingBrick: val }),

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

  selectionMode: "Single",
  setSelectionMode: (mode) => set({ selectionMode: mode }),

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
    }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setSelectedType: (selectedType) =>
    set({
      selectedType,
      activePreset: null,
      movingBrickId: null,
      isDraggingBrick: false,
    }),
  setSelectedColor: (selectedColor) => set({ selectedColor }),

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
    const check = checkStructureValid(
      bricks,
      presetBricks,
      ms,
      bh,
      0.01,
      activePreset,
    );
    if (!check.valid) {
      console.warn("Preset placement blocked:", check.reason);
      return;
    }

    const newBricks = [...bricks, ...presetBricks];
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });
    localStorage.setItem("brickxr-save", JSON.stringify(newBricks));
  },
}));

export const LEGO_COLORS = COLORS;
