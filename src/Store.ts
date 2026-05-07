import { create } from 'zustand';

export type BrickType = '1x1' | '1x2' | '2x2' | '2x3' | '2x4';
export const BRICK_TYPES: BrickType[] = ['1x1', '1x2', '2x2', '2x3', '2x4'];

export interface BrickData {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number; // Y-axis rotation in degrees
}

export const isValidBrickData = (item: any): boolean => {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string') return false;
  if (!BRICK_TYPES.includes(item.type)) return false;
  if (typeof item.color !== 'string') return false;
  if (!Array.isArray(item.position) || item.position.length !== 3 || !item.position.every((n: any) => typeof n === 'number' && Number.isFinite(n))) return false;
  if (typeof item.rotation !== 'number' || !Number.isFinite(item.rotation)) return false;
  return true;
};

export const getBrickDimensions = (type: BrickType) => {
  switch (type) {
    case '1x1': return { w: 1, d: 1 };
    case '1x2': return { w: 1, d: 2 };
    case '2x2': return { w: 2, d: 2 };
    case '2x3': return { w: 2, d: 3 };
    case '2x4': return { w: 2, d: 4 };
    default: return { w: 1, d: 1 };
  }
};

export const getOccupiedCells = (brick: Omit<BrickData, 'color'>, moduleSize: number) => {
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
  bricks: Omit<BrickData, 'color'>[], 
  ghostData: Omit<BrickData, 'color'>, 
  moduleSize: number, 
  brickHeight: number, 
  epsilon: number = 0.01,
  ignoreBrickId?: string
) => {
  const ghostCells = getOccupiedCells(ghostData, moduleSize);

  // MUST NOT OVERLAP
  const isOverlap = bricks.some(b => {
    if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId)) return false;
    if (Math.abs(b.position[1] - ghostData.position[1]) > epsilon) return false;
    const bCells = getOccupiedCells(b, moduleSize);
    return ghostCells.some(gc => 
      bCells.some(bc => 
        Math.abs(gc.x - bc.x) < epsilon && 
        Math.abs(gc.z - bc.z) < epsilon
      )
    );
  });

  if (isOverlap) return { valid: false, reason: 'overlap' };

  // Ground check
  if (ghostData.position[1] <= epsilon) return { valid: true, reason: 'grounded' };

  // Connection check (Support from below)
  // AT LEAST ONE occupied footprint cell MUST be supported by a brick below
  const isSupported = ghostCells.some(gc => {
    return bricks.some(b => {
      if (b.id === ghostData.id || (ignoreBrickId && b.id === ignoreBrickId)) return false;
      
      const dy = ghostData.position[1] - b.position[1];
      if (Math.abs(dy - brickHeight) < epsilon) {
        const bCells = getOccupiedCells(b, moduleSize);
        return bCells.some(bc => 
          Math.abs(gc.x - bc.x) < epsilon && 
          Math.abs(gc.z - bc.z) < epsilon
        );
      }
      return false;
    });
  });

  return isSupported ? { valid: true, reason: 'supported' } : { valid: false, reason: 'floating' };
};

export const hasBrickAbove = (
  brick: Omit<BrickData, 'color'>,
  bricks: Omit<BrickData, 'color'>[],
  moduleSize: number,
  brickHeight: number,
  epsilon: number = 0.01
) => {
  const targetTopY = brick.position[1] + brickHeight;
  
  // 1. Find bricks exactly one layer above the selected brick
  const bricksDirectlyAbove = bricks.filter(b => Math.abs(b.position[1] - targetTopY) < epsilon);
  
  const targetCells = getOccupiedCells(brick, moduleSize);

  for (const b of bricksDirectlyAbove) {
    const bCells = getOccupiedCells(b, moduleSize);

    // 2. X/Z occupied cells truly overlap
    const overlappingCells = bCells.filter(bc => 
      targetCells.some(tc => Math.abs(bc.x - tc.x) < epsilon && Math.abs(bc.z - tc.z) < epsilon)
    );

    if (overlappingCells.length > 0) {
      // 3. Check if removing selected brick removes the other brick's valid support
      // Find if `b` is supported by ANY OTHER brick exactly on the same layer as `brick`
      const otherSupports = bricks.filter(other => 
        other.id !== brick.id && 
        other.id !== b.id && 
        Math.abs(other.position[1] - brick.position[1]) < epsilon
      );

      let hasAlternateSupport = false;
      for (const other of otherSupports) {
        const otherCells = getOccupiedCells(other, moduleSize);
        const overlapWithOther = bCells.some(bc => 
          otherCells.some(oc => Math.abs(bc.x - oc.x) < epsilon && Math.abs(bc.z - oc.z) < epsilon)
        );
        if (overlapWithOther) {
          hasAlternateSupport = true;
          break;
        }
      }

      console.log(`[Delete Audit] Selected: ${brick.id}, Above: ${b.id}`);
      console.log(`- Overlap cells found: ${overlappingCells.length}`);
      console.log(`- Selected Top Y: ${targetTopY.toFixed(3)}, Above Bottom Y: ${b.position[1].toFixed(3)}`);
      console.log(`- Has Alternate Support: ${hasAlternateSupport}`);

      if (!hasAlternateSupport) {
        return true; 
      }
    }
  }
  
  return false;
};

export const checkStructureValid = (
  bricks: Omit<BrickData, 'color'>[],
  presetBricks: Omit<BrickData, 'color'>[],
  moduleSize: number,
  brickHeight: number,
  epsilon: number = 0.01,
  presetName?: string
): { valid: boolean, reason?: string } => {
  if (presetBricks.length === 0) return { valid: false, reason: 'empty preset' };

  const minY = Math.min(...presetBricks.map(b => b.position[1]));
  const baseBricks = presetBricks.filter(b => b.position[1] === minY);
  
  let isValidPlacement = false;
  if (minY <= epsilon) {
    isValidPlacement = true;
  } else {
    isValidPlacement = baseBricks.every(baseBrick => {
      const dummyValid = checkPlacementValid(bricks, baseBrick, moduleSize, brickHeight, epsilon);
      return dummyValid.valid;
    });
  }

  if (!isValidPlacement) return { valid: false, reason: 'unsupported' };

  const hasOverlap = presetBricks.some(pb => {
    const dummyValid = checkPlacementValid(bricks, pb, moduleSize, brickHeight, epsilon);
    return !dummyValid.valid && dummyValid.reason === 'overlap';
  });

  if (hasOverlap) return { valid: false, reason: 'overlap' };

  return { valid: true };
};

export type PresetName = 'tree' | 'cabin' | 'round_water_well' | 'pine_tree' | 'walk_in_castle';
export type AppMode = 'Build' | 'Move' | 'Delete';

interface HistoryState {
  bricks: BrickData[];
}

interface LegoStore {
  bricks: BrickData[];
  mode: AppMode;
  selectedType: BrickType;
  selectedColor: string;
  undoStack: HistoryState[];
  redoStack: HistoryState[];
  toastMessage: string | null;
  movingBrickId: string | null;
  
  // Actions
  addBrick: (brick: Omit<BrickData, 'id'>) => void;
  removeBrick: (id: string) => void;
  updateBrick: (id: string, updates: Partial<BrickData>) => void;
  setMode: (mode: AppMode) => void;
  setSelectedType: (type: BrickType) => void;
  setSelectedColor: (color: string) => void;
  setToastMessage: (msg: string | null) => void;
  setMovingBrickId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  setBricks: (bricks: BrickData[]) => void;
  loadPreset: (presetName: PresetName | null) => void;
  commitPreset: (position: [number, number, number]) => void;
  activePreset: PresetName | null;
}

const COLORS = [
  '#E3000B', // Red
  '#0055BF', // Blue
  '#FFD500', // Yellow
  '#FFFFFF', // White
  '#000000', // Black
  '#00AD3C', // Green
  '#8B4513', // Wood/Brown
];

// Presets using accurate sizing
const ms = 0.08; // MODULE_SIZE
const bh = 0.096; // BRICK_HEIGHT

const createBrick = (type: BrickType, color: string, px: number, py: number, pz: number, rotation: number = 0): BrickData => ({
  id: crypto.randomUUID(),
  type,
  color,
  position: [px * ms, py * bh, pz * ms],
  rotation
});

const generateLifeSizedTree = (): BrickData[] => {
  const tree: BrickData[] = [];
  const trunkColor = '#8B4513'; // Standard Brown
  const leafColor = '#00AD3C';  // Standard Green
  
  // Taller Trunk (Stacked 2x2)
  // Height ~2.8m (30 bricks)
  const trunkTopY = 28;
  for (let y = 0; y < trunkTopY; y++) {
    tree.push(createBrick('2x2', trunkColor, 0, y, 0));
  }

  // Full Leaf Canopy Distribution
  // Starts from mid-trunk (y=12) and goes above the trunk top (y=38)
  for (let y = 12; y < 38; y++) {
    let layerRadius = 0;
    
    if (y < 20) {
      // Expanding base: 1 to 4
      layerRadius = 1 + (y - 12) * 0.4;
    } else if (y < 32) {
      // Wide middle: 4 to 6
      layerRadius = 4 + (y - 20) * 0.15;
    } else {
      // Rounded top taper: 6 down to 1
      layerRadius = 6 - (y - 32) * 1;
    }

    const r = Math.max(1, layerRadius);
    for (let x = -Math.floor(r); x <= Math.floor(r); x++) {
      for (let z = -Math.floor(r); z <= Math.floor(r); z++) {
        // Distance check for rounded layers
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= r) {
          // Inner core density check (avoid overwriting trunk)
          if (y < trunkTopY && dist < 1.1) continue;
          
          // Add some organic variation by skipping random internal bricks if wanted, 
          // but for LEGO feel, solid is usually better.
          tree.push(createBrick('2x2', leafColor, x, y, z));
        }
      }
    }
  }
  
  return tree;
};

const generateLifeSizedCabin = (): BrickData[] => {
  const cabin: BrickData[] = [];
  const brown = '#8B4513'; // ONLY brown bricks as requested

  // Base floor
  for (let x = -5; x <= 5; x += 2) {
    for (let z = -5; z <= 5; z += 4) {
      cabin.push(createBrick('2x4', brown, x, 0, z));
    }
  }

  // Walls (Height 20 bricks)
  for (let y = 1; y < 21; y++) {
    // Back Wall
    cabin.push(createBrick('2x4', brown, -3, y, -5, 0));
    cabin.push(createBrick('2x4', brown, 1, y, -5, 0));
    cabin.push(createBrick('2x2', brown, 4, y, -5, 0));
    
    // Left Wall
    cabin.push(createBrick('2x4', brown, -5, y, -3, 90));
    cabin.push(createBrick('2x4', brown, -5, y, 1, 90));
    cabin.push(createBrick('2x2', brown, -5, y, 4, 90));
    
    // Right Wall (with a window)
    if (y < 12 || y > 16) {
      cabin.push(createBrick('2x4', brown, 5, y, -3, 90));
      cabin.push(createBrick('2x4', brown, 5, y, 1, 90));
      cabin.push(createBrick('2x2', brown, 5, y, 4, 90));
    } else {
      // Window opening at height 12-16
      cabin.push(createBrick('2x2', brown, 5, y, -4, 90));
      cabin.push(createBrick('2x2', brown, 5, y, 4, 90));
    }
    
    // Front Wall (door opening)
    if (y > 15) {
      // Span above door
      cabin.push(createBrick('2x4', brown, -3, y, 5, 0));
      cabin.push(createBrick('2x4', brown, 1, y, 5, 0));
      cabin.push(createBrick('2x2', brown, 4, y, 5, 0));
    } else {
      // Sides of door
      cabin.push(createBrick('2x2', brown, -4, y, 5, 0));
      cabin.push(createBrick('2x2', brown, 4, y, 5, 0));
    }
  }

  // Roof (Simple flat roof for now with some overhang)
  for (let x = -6; x <= 6; x += 2) {
    for (let z = -6; z <= 6; z += 4) {
      cabin.push(createBrick('2x4', brown, x, 21, z));
    }
  }

  return cabin;
};

const generateRoundWaterWell = (): BrickData[] => {
  const well: BrickData[] = [];
  const stone = '#A0A0A0';
  const darkStone = '#707070';
  const blue = '#0055BF';
  const brown = '#8B4513';

  for (let y = 0; y < 6; y++) {
    well.push(createBrick('2x4', stone, -4, y, 0, 90));
    well.push(createBrick('2x4', stone, 4, y, 0, 90));
    well.push(createBrick('2x4', stone, 0, y, -4, 0));
    well.push(createBrick('2x4', stone, 0, y, 4, 0));

    const activeStone = y % 2 === 0 ? darkStone : stone;
    well.push(createBrick('2x2', activeStone, -4, y, -4, 0));
    well.push(createBrick('2x2', activeStone, 4, y, -4, 0));
    well.push(createBrick('2x2', activeStone, -4, y, 4, 0));
    well.push(createBrick('2x2', activeStone, 4, y, 4, 0));
  }

  for (let x = -2; x <= 2; x += 2) {
    for (let z = -2; z <= 2; z += 2) {
      if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
      well.push(createBrick('2x2', blue, x, 3, z, 0));
    }
  }
  well.push(createBrick('2x2', blue, -2, 3, -2, 0));
  well.push(createBrick('2x2', blue, 2, 3, -2, 0));
  well.push(createBrick('2x2', blue, -2, 3, 2, 0));
  well.push(createBrick('2x2', blue, 2, 3, 2, 0));

  for (let y = 6; y < 14; y++) {
    well.push(createBrick('2x2', brown, -4, y, 0, 0));
    well.push(createBrick('2x2', brown, 4, y, 0, 0));
  }

  for (let x = -6; x <= 6; x += 2) {
    well.push(createBrick('2x4', brown, x, 14, -2, 90));
    well.push(createBrick('2x4', brown, x, 14, 2, 90));
    if (x >= -4 && x <= 4) {
      well.push(createBrick('2x2', brown, x, 15, 0, 0));
    }
  }

  return well;
};

const generatePineTree = (): BrickData[] => {
  const tree: BrickData[] = [];
  const brown = '#8B4513';
  const green = '#00AD3C';

  for (let y = 0; y < 12; y++) {
    tree.push(createBrick('2x2', brown, 0, y, 0, 0));
  }

  const layers = [
    { startY: 8, radius: 8 },
    { startY: 12, radius: 6 },
    { startY: 17, radius: 4 },
    { startY: 23, radius: 2 }
  ];

  for (let i = 0; i < layers.length; i++) {
    const curLayer = layers[i];
    const nextY = i < layers.length - 1 ? layers[i+1].startY : 28;
    
    let currentRadius = curLayer.radius;
    for (let y = curLayer.startY; y < nextY; y++) {
      for (let x = -currentRadius; x <= currentRadius; x += 2) {
        for (let z = -currentRadius; z <= currentRadius; z += 2) {
           if (Math.abs(x) + Math.abs(z) <= currentRadius * 1.3) {
              if (Math.abs(x) <= 1 && Math.abs(z) <= 1 && y < 12) continue;
              tree.push(createBrick('2x2', green, x, y, z, 0));
           }
        }
      }
      if (y % 2 === 1 && currentRadius > 2) {
         currentRadius -= 2; 
      }
    }
  }
  
  tree.push(createBrick('1x1', green, -1, 28, -1, 0));
  tree.push(createBrick('1x1', green, 1, 28, -1, 0));
  tree.push(createBrick('1x1', green, -1, 28, 1, 0));
  tree.push(createBrick('1x1', green, 1, 28, 1, 0));

  return tree;
};

const generateWalkInCastle = (): BrickData[] => {
  const castle: BrickData[] = [];
  const stone = '#A0A0A0';
  const darkStone = '#707070';
  const black = '#000000';
  
  // Left Wall: px = -13, pz = -10, -6, -2, 2, 6, 10
  // Right Wall: px = 13, pz = -10, -6, -2, 2, 6, 10
  for (let y = 0; y <= 9; y++) {
    for (const pz of [-10, -6, -2, 2, 6, 10]) {
      castle.push(createBrick('2x4', stone, -13, y, pz, 0));
      castle.push(createBrick('2x4', stone, 13, y, pz, 0));
    }
  }

  // Back Wall: pz = -13
  for (let y = 0; y <= 9; y++) {
    for (const px of [-10, -6, -2, 2, 6, 10]) {
      castle.push(createBrick('2x4', stone, px, y, -13, 90));
    }
  }

  // Front Wall: pz = 13
  for (let y = 0; y <= 5; y++) {
    for (const px of [-10, -6, 6, 10]) {
      castle.push(createBrick('2x4', stone, px, y, 13, 90));
    }
    // Gap [-2, 2]. Use 2x2 at -3 and 3
    castle.push(createBrick('2x2', stone, -3, y, 13, 0));
    castle.push(createBrick('2x2', stone, 3, y, 13, 0));
  }
  castle.push(createBrick('2x4', stone, -10, 6, 13, 90));
  castle.push(createBrick('2x2', stone, -7, 6, 13, 0));
  castle.push(createBrick('2x4', stone, -4, 6, 13, 90));
  castle.push(createBrick('2x4', stone, 4, 6, 13, 90));
  castle.push(createBrick('2x2', stone, 7, 6, 13, 0));
  castle.push(createBrick('2x4', stone, 10, 6, 13, 90));
  
  for (let y = 7; y <= 9; y++) {
    for (const px of [-10, -6, -2, 2, 6, 10]) {
      castle.push(createBrick('2x4', stone, px, y, 13, 90));
    }
  }

  // Divider Wall: pz = 0
  for (let y = 0; y <= 5; y++) {
    for (const px of [-9, -5, -1, 7]) {
      castle.push(createBrick('2x4', stone, px, y, 0, 90));
    }
    castle.push(createBrick('2x2', stone, 10, y, 0, 0));
  }
  castle.push(createBrick('2x4', stone, -9, 6, 0, 90));
  castle.push(createBrick('2x4', stone, -5, 6, 0, 90));
  castle.push(createBrick('2x2', stone, -2, 6, 0, 0));
  castle.push(createBrick('2x4', stone, 1, 6, 0, 90));
  castle.push(createBrick('2x4', stone, 5, 6, 0, 90));
  castle.push(createBrick('2x4', stone, 9, 6, 0, 90));
  
  for (let y = 7; y <= 9; y++) {
    for (const px of [-9, -5, -1, 3, 7]) {
      castle.push(createBrick('2x4', stone, px, y, 0, 90));
    }
    castle.push(createBrick('2x2', stone, 10, y, 0, 0));
  }

  // Roof / Ceiling Strips on top of all walls (y = 10)
  for (const pz of [-10, -6, -2, 2, 6, 10]) {
    castle.push(createBrick('2x4', stone, -13, 10, pz, 0));
    castle.push(createBrick('2x4', stone, 13, 10, pz, 0));
  }
  for (const px of [-10, -6, -2, 2, 6, 10]) {
    castle.push(createBrick('2x4', stone, px, 10, -13, 90));
    castle.push(createBrick('2x4', stone, px, 10, 13, 90));
  }
  for (const px of [-9, -5, -1, 3, 7]) {
    castle.push(createBrick('2x4', stone, px, 10, 0, 90));
  }
  castle.push(createBrick('2x2', stone, 10, 10, 0, 0));
  
  // Battlements on Top of outer walls (y = 11) using 2x2 bricks
  // Alternating blocks create a crenellated zigzag pattern
  for (const pz of [-10, -6, -2, 2, 6, 10]) {
    castle.push(createBrick('2x2', stone, -13, 11, pz, 0));
    castle.push(createBrick('2x2', stone, 13, 11, pz, 0));
  }
  for (const px of [-10, -6, -2, 2, 6, 10]) {
    castle.push(createBrick('2x2', stone, px, 11, -13, 0));
    castle.push(createBrick('2x2', stone, px, 11, 13, 0));
  }

  // Corners / Towers
  const corners = [
    [-13, -13], [-13, 13], [13, -13], [13, 13]
  ];
  for (const [cx, cz] of corners) {
    // Fill the empty corner spaces for the walls!
    for (let y = 0; y <= 9; y++) {
      castle.push(createBrick('2x2', stone, cx, y, cz, 0));
    }
    // Build the taller tower up (y=10 to y=14)
    for (let y = 10; y <= 14; y++) {
      castle.push(createBrick('2x2', stone, cx, y, cz, 0));
    }
    // Add small crenellated tops to corners using 1x1 bricks
    castle.push(createBrick('1x1', stone, cx - 0.5, 15, cz - 0.5, 0));
    castle.push(createBrick('1x1', stone, cx + 0.5, 15, cz + 0.5, 0));
  }

  return castle;
};

export const PRESETS: Record<PresetName, BrickData[]> = {
  tree: generateLifeSizedTree(),
  cabin: generateLifeSizedCabin(),
  round_water_well: generateRoundWaterWell(),
  pine_tree: generatePineTree(),
  walk_in_castle: generateWalkInCastle()
};

export const useLegoStore = create<LegoStore>((set, get) => ({
  bricks: [],
  mode: 'Build',
  selectedType: '2x2',
  selectedColor: COLORS[0],
  activePreset: null,
  undoStack: [],
  redoStack: [],
  toastMessage: null,
  movingBrickId: null,

  setToastMessage: (msg) => set({ toastMessage: msg }),
  setMovingBrickId: (id) => set({ movingBrickId: id }),

  addBrick: (newBrickData) => {
    const { bricks, undoStack } = get();
    const newBrick = { ...newBrickData, id: crypto.randomUUID() };
    
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: [...bricks, newBrick],
    });
    
    // Save to local storage
    localStorage.setItem('brickxr-save', JSON.stringify([...bricks, newBrick]));
  },

  removeBrick: (id) => {
    const { bricks, undoStack } = get();

    const brickToRemove = bricks.find(b => b.id === id);
    if (!brickToRemove) return;

    if (hasBrickAbove(brickToRemove, bricks, 0.08, 0.096)) {
      if (typeof window !== 'undefined') {
        get().setToastMessage("Cannot delete: brick has another brick above it.");
        setTimeout(() => {
          if (get().toastMessage === "Cannot delete: brick has another brick above it.") {
            get().setToastMessage(null);
          }
        }, 3000);
      }
      return;
    }

    const newBricks = bricks.filter(b => b.id !== id);
    
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });
    
    localStorage.setItem('brickxr-save', JSON.stringify(newBricks));
  },

  updateBrick: (id, updates) => {
    const { bricks, undoStack } = get();
    const newBricks = bricks.map(b => b.id === id ? { ...b, ...updates } : b);
    
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
    });
    
    localStorage.setItem('brickxr-save', JSON.stringify(newBricks));
  },

  setMode: (mode) => set({ mode, activePreset: null, movingBrickId: null }),
  setSelectedType: (selectedType) => set({ selectedType, activePreset: null, movingBrickId: null }),
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
    
    localStorage.setItem('brickxr-save', JSON.stringify(prevState.bricks));
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
    
    localStorage.setItem('brickxr-save', JSON.stringify(nextState.bricks));
  },

  clearAll: () => {
    const { bricks, undoStack } = get();
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: [],
    });
    localStorage.removeItem('brickxr-save');
  },

  setBricks: (newBricks) => {
    set({ bricks: newBricks, undoStack: [], redoStack: [] });
    localStorage.setItem('brickxr-save', JSON.stringify(newBricks));
  },

  loadPreset: (presetName) => {
    set({ activePreset: presetName, mode: 'Build' });
  },

  commitPreset: (position) => {
    const { activePreset, bricks, undoStack } = get();
    if (!activePreset) return;

    const validPresetBricks = PRESETS[activePreset].filter(b => {
      const valid = isValidBrickData(b);
      if (!valid) console.warn(`Malformed brick found in preset ${activePreset}:`, b);
      return valid;
    });

    const presetBricks = validPresetBricks.map(b => ({
      ...b,
      id: crypto.randomUUID(),
      position: [
        b.position[0] + position[0],
        b.position[1] + position[1],
        b.position[2] + position[2]
      ] as [number, number, number]
    }));

    // STRUCTURE PLACEMENT VALIDATION
    const check = checkStructureValid(bricks, presetBricks, ms, bh, 0.01, activePreset);
    if (!check.valid) {
      console.warn('Preset placement blocked:', check.reason);
      return;
    }

    const newBricks = [...bricks, ...presetBricks];
    set({
      undoStack: [...undoStack, { bricks: [...bricks] }],
      redoStack: [],
      bricks: newBricks,
      activePreset: null
    });
    localStorage.setItem('brickxr-save', JSON.stringify(newBricks));
  },
}));

export const LEGO_COLORS = COLORS;
