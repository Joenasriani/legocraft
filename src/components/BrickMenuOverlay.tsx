import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLegoStore, BrickType } from "../Store";

interface BrickMenuOverlayProps {
  show: boolean;
  onClose: () => void;
  brickMenuRef: React.RefObject<HTMLDivElement | null>;
  brickTypes: BrickType[];
}

const BrickMenuOverlay = ({
  show,
  onClose,
  brickMenuRef,
  brickTypes,
}: BrickMenuOverlayProps) => {
  const selectedType = useLegoStore((state) => state.selectedType);
  const setSelectedType = useLegoStore((state) => state.setSelectedType);
  const loadPreset = useLegoStore((state) => state.loadPreset);
  const setMode = useLegoStore((state) => state.setMode);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="brick-menu-panel"
          ref={brickMenuRef}
          initial={{ opacity: 0, y: 200, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 200, x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/80 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] flex flex-col gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)] scroll-panel"
        >
          <div className="bg-blue-500/20 px-4 py-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-1 rounded-t-[19px] sm:rounded-t-[23px] border-b border-blue-500/30">
            <div className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
              Standard Bricks
            </div>
          </div>
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {brickTypes.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  loadPreset(null);
                  setMode("Build");
                  onClose();
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-2xl w-[90px] transition-colors flex-shrink-0 ${
                  selectedType === type
                    ? "bg-accent/20 border-accent/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
                title={`Select brick type: ${type}`}
              >
                <span className={`text-2xl font-black font-mono tracking-tighter flex items-center justify-center h-10 w-10 ${selectedType === type ? 'text-accent' : 'text-white'}`}>
                  {type}
                </span>
                <div className="text-center w-full">
                  <div className={`text-[10px] font-bold leading-tight truncate uppercase tracking-widest ${selectedType === type ? 'text-accent/80' : 'text-white/40'}`}>
                    Brick
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrickMenuOverlay;
