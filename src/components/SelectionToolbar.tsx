import { Html } from "@react-three/drei";
import { Copy, ClipboardPaste, Trash2 } from "lucide-react";
import { useLegoStore, getBrickAABB, getBrickHeightUnit, BrickData, getBrickDimensions } from "../Store";
import { BRICK_HEIGHT, MODULE_SIZE } from "../constants";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { audioService } from "../services/audioService";

interface SelectionToolbarProps {
  selectedBricks: BrickData[];
}

export const SelectionToolbar = ({ selectedBricks }: SelectionToolbarProps) => {
  const mode = useLegoStore((state) => state.mode);
  const isDraggingBrick = useLegoStore((state) => state.isDraggingBrick);
  const clipboardBricks = useLegoStore((state) => state.clipboardBricks);

  const show = mode === "Move" && !isDraggingBrick && selectedBricks.length > 0;

  const position = useMemo(() => {
    if (!show || selectedBricks.length === 0) return null;
    let minX = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const b of selectedBricks) {
      const aabb = getBrickAABB(b);
      if (aabb.minX < minX) minX = aabb.minX;
      if (aabb.maxX > maxX) maxX = aabb.maxX;
      const top = b.position[1] + getBrickHeightUnit(b.type) * BRICK_HEIGHT;
      if (top > maxY) maxY = top;
      if (aabb.minZ < minZ) minZ = aabb.minZ;
      if (aabb.maxZ > maxZ) maxZ = aabb.maxZ;
    }
    return [
      (minX + maxX) / 2,
      maxY + 0.4,
      (minZ + maxZ) / 2,
    ] as [number, number, number];
  }, [selectedBricks, show]);

  const handleCopy = () => {
    useLegoStore.getState().setClipboardBricks(selectedBricks);
    useLegoStore.getState().setToastMessage("Copied to clipboard");
  };

  const handlePaste = () => {
    const { addBricks, setSelectionMode, setMovingBrickId, setMultiSelectedBrickIds } = useLegoStore.getState();
    if (clipboardBricks.length === 0) return;
    
    
    const newBricks = clipboardBricks.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
      position: [
        b.position[0] + getBrickDimensions("1x1").w * MODULE_SIZE,
        b.position[1],
        b.position[2] + getBrickDimensions("1x1").d * MODULE_SIZE,
      ] as [number, number, number],
    }));

    addBricks(newBricks);
    
    if (newBricks.length === 1) {
      setSelectionMode("Solo");
      setMovingBrickId(newBricks[0].id);
      setMultiSelectedBrickIds([]);
    } else {
      setSelectionMode("Multi");
      setMultiSelectedBrickIds(newBricks.map((b) => b.id));
      setMovingBrickId(null);
    }
    useLegoStore.getState().setToastMessage("Pasted!");
  };

  const handleDelete = () => {
    const { removeBrick, setMovingBrickId, setMultiSelectedBrickIds } = useLegoStore.getState();
    selectedBricks.forEach(b => removeBrick(b.id));
    setMovingBrickId(null);
    setMultiSelectedBrickIds([]);
  };

  return (
    <AnimatePresence>
      {show && position && (
        <Html
          position={position}
          center
          zIndexRange={[100, 0]}
          style={{
            pointerEvents: "none",
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 p-1.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-[20px] shadow-2xl">
              <button
                onClick={handleCopy}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors flex items-center justify-center outline-none"
                title="Copy (Ctrl+C)"
              >
                <Copy size={16} strokeWidth={1.5} />
              </button>
              
              <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
              
              {clipboardBricks.length > 0 && (
                <>
                  <button
                    onClick={handlePaste}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors flex items-center justify-center outline-none"
                    title="Paste (Ctrl+V)"
                  >
                    <ClipboardPaste size={16} strokeWidth={1.5} />
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
                </>
              )}
              
              <button
                onClick={handleDelete}
                className="p-1.5 text-white/80 hover:text-red-400 hover:bg-white/15 rounded-full transition-colors flex items-center justify-center outline-none"
                title="Delete (Backspace/Del)"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        </Html>
      )}
    </AnimatePresence>
  );
};
