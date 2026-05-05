import { create } from 'zustand';

export type BrickType = '1x1' | '1x2' | '2x2' | '2x3' | '2x4';

export interface BrickData {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number; // Y-axis rotation in degrees
}

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
  epsilon: number = 0.01
) => {
  const ghostCells = getOccupiedCells(ghostData, moduleSize);

  // Overlap check
  const isOverlap = bricks.some(b => {
    if (b.id === ghostData.id) return false;
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
  if (ghostData.position[1] < epsilon) return { valid: true, reason: 'grounded' };

  // Support check
  const isSupported = bricks.some(b => {
    if (b.id === ghostData.id) return false;
    if (Math.abs(b.position[1] - (ghostData.position[1] - brickHeight)) > epsilon) return false;
    const bCells = getOccupiedCells(b, moduleSize);
    return ghostCells.some(gc => 
      bCells.some(bc => 
        Math.abs(gc.x - bc.x) < epsilon && 
        Math.abs(gc.z - bc.z) < epsilon
      )
    );
  });

  return isSupported ? { valid: true, reason: 'supported' } : { valid: false, reason: 'floating' };
};

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
  
  // Actions
  addBrick: (brick: Omit<BrickData, 'id'>) => void;
  removeBrick: (id: string) => void;
  updateBrick: (id: string, updates: Partial<BrickData>) => void;
  setMode: (mode: AppMode) => void;
  setSelectedType: (type: BrickType) => void;
  setSelectedColor: (color: string) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  setBricks: (bricks: BrickData[]) => void;
  loadPreset: (presetName: 'tree' | 'cabin' | null) => void;
  commitPreset: (position: [number, number, number]) => void;
  activePreset: 'tree' | 'cabin' | null;
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

export const PRESETS = {
  tree: generateLifeSizedTree(),
  cabin: generateLifeSizedCabin()
};

export const useLegoStore = create<LegoStore>((set, get) => ({
  bricks: [],
  mode: 'Build',
  selectedType: '2x2',
  selectedColor: COLORS[0],
  activePreset: null,
  undoStack: [],
  redoStack: [],

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

  setMode: (mode) => set({ mode, activePreset: null }),
  setSelectedType: (selectedType) => set({ selectedType, activePreset: null }),
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

    const presetBricks = PRESETS[activePreset].map(b => ({
      ...b,
      id: crypto.randomUUID(),
      position: [
        b.position[0] + position[0],
        b.position[1] + position[1],
        b.position[2] + position[2]
      ] as [number, number, number]
    }));

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
