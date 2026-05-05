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

export const useLegoStore = create<LegoStore>((set, get) => ({
  bricks: [],
  mode: 'Build',
  selectedType: '2x2',
  selectedColor: COLORS[0],
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

  setMode: (mode) => set({ mode }),
  setSelectedType: (selectedType) => set({ selectedType }),
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
}));

export const LEGO_COLORS = COLORS;
