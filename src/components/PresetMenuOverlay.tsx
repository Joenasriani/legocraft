import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLegoStore } from "../Store";

interface PresetMenuOverlayProps {
  show: boolean;
  onClose: () => void;
  presetMenuRef: React.RefObject<HTMLDivElement>;
  presets: any[];
}

const PresetMenuOverlay = ({ show, onClose, presetMenuRef, presets }: PresetMenuOverlayProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={presetMenuRef}
          initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/90 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)]"
        >
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                const state = useLegoStore.getState();
                if (state.activePreset === preset.id) {
                  state.loadPreset(null);
                } else {
                  state.loadPreset(preset.id);
                }
                onClose();
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
            >
              <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">
                {preset.icon}
              </span>
              <div className="text-center w-full">
                <div className="text-[12px] font-bold text-white leading-tight truncate">
                  {preset.name}
                </div>
                <div className="text-[10px] text-white/50 leading-tight mt-1 px-1 line-clamp-2">
                  {preset.desc}
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PresetMenuOverlay;
