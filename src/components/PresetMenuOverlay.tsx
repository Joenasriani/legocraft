import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLegoStore } from "../Store";

interface PresetMenuOverlayProps {
  show: boolean;
  onClose: () => void;
  presetMenuRef: React.RefObject<HTMLDivElement | null>;
  presets: any[];
}

const PresetMenuOverlay = ({
  show,
  onClose,
  presetMenuRef,
  presets,
}: PresetMenuOverlayProps) => {
  const activePreset = useLegoStore((state) => state.activePreset);
  const loadPreset = useLegoStore((state) => state.loadPreset);
  const setMode = useLegoStore((state) => state.setMode);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={presetMenuRef}
          initial={{ opacity: 0, y: 200, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 200, x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/80 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] flex flex-col gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)] scroll-panel"
        >
          <div className="bg-blue-500/20 px-4 py-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-1 rounded-t-[19px] sm:rounded-t-[23px] border-b border-blue-500/30">
            <div className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
              Presets
            </div>
          </div>
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {presets.map((preset) => {
              const isActive = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (isActive) {
                      loadPreset(null);
                    } else {
                      loadPreset(preset.id);
                      onClose();
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-2xl w-[90px] transition-colors flex-shrink-0 ${
                    isActive
                      ? "bg-accent/20 border-accent/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <span
                    className={`text-3xl flex items-center justify-center h-10 w-10 ${
                      isActive ? "text-accent" : "text-white"
                    }`}
                  >
                    {preset.icon}
                  </span>
                  <div className="text-center w-full">
                    <div
                      className={`text-[12px] font-bold leading-tight truncate ${
                        isActive ? "text-white" : "text-white/80"
                      }`}
                    >
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-white/40 leading-tight mt-1 px-1 line-clamp-2">
                      {preset.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PresetMenuOverlay;
