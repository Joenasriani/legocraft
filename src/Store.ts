import { create } from 'zustand';

export type BrickType = '1x1' | '1x2' | '2x2' | '2x3' | '2x4';

export interface BrickData {
  id: string;
  type: BrickType;
  color: string;
  position: [number, number, number];
  rotation: number; // Y-axis rotation in degrees
}

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
