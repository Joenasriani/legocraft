import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLegoStore, SHAPE_DEFS } from "../Store";

export const ShapeIcon = ({ id, active, supported }: { id: string, active: boolean, supported: boolean }) => {
  const color = supported ? (active ? "currentColor" : "white") : "white";
  const opacity = supported ? (active ? "1" : "0.6") : "0.2";
  
  switch (id) {
    case "1x1_round_cylinder":
    case "2x2_round_cylinder":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <ellipse cx="12" cy="7" rx="6" ry="2" />
           <path d="M6 7v10c0 1.1 6 1.1 12 0V7" />
        </svg>
      );
    case "1x1_cone":
    case "2x2_cone":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <ellipse cx="12" cy="6" rx="2" ry="1" />
           <path d="M10 6l-4 12c-0.2 0.5 4 1.5 6 1.5s6.2-1 6-1.5l-4-12" />
        </svg>
      );
    case "4x4_dome":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 16 C4 8 20 8 20 16" />
           <ellipse cx="12" cy="16" rx="8" ry="2" />
        </svg>
      );
    case "1x2_slope":
    case "2x2_slope":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M5 18L19 18L19 16L5 6Z" fill={color} fillOpacity="0.2" />
           <path d="M5 18L19 18L19 16L5 6Z" />
         </svg>
      );
    case "quarter_cylinder":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 4 h16 v16 A16 16 0 0 1 4 4 Z" fill={color} fillOpacity="0.2" />
           <path d="M4 4 h16 v16 A16 16 0 0 1 4 4 Z" />
         </svg>
      );
    case "half_cylinder":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 12 h16 A8 8 0 0 1 4 12 Z" fill={color} fillOpacity="0.2" />
           <path d="M20 12 A8 8 0 0 0 4 12 v4 h16 v-4 Z" />
         </svg>
      );
    case "wedge":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <polygon points="4,20 20,20 4,4" fill={color} fillOpacity="0.2" />
           <polygon points="4,20 20,20 4,4" />
         </svg>
      );
    case "inverted_slope":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M5 6 L19 6 L19 8 L5 18 Z" fill={color} fillOpacity="0.2" />
           <path d="M5 6 L19 6 L19 8 L5 18 Z" />
         </svg>
      );
    case "2x2_corner_triangle":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <polygon points="12,4 4,20 20,20" fill={color} fillOpacity="0.2" />
           <polygon points="12,4 4,20 20,20" />
         </svg>
      );
    case "arch":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 18 L4 6 L20 6 L20 18 L16 18 Q12 10 8 18 Z" fill={color} fillOpacity="0.2" />
           <path d="M4 18 L4 6 L20 6 L20 18 L16 18 Q12 10 8 18 Z" />
         </svg>
      );
    case "corner_slope":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <polygon points="4,18 20,18 20,6 4,14" fill={color} fillOpacity="0.2" />
           <path d="M4 18 L20 18 L20 6 L4 14 Z M20 6 L4 18" />
         </svg>
      );
    case "curved_corner":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 20 H20 V4 A16 16 0 0 0 4 20 Z" fill={color} fillOpacity="0.2" />
           <path d="M4 20 H20 V4 A16 16 0 0 0 4 20 Z" />
           <path d="M12 20 A8 8 0 0 0 20 12" />
         </svg>
      );
    default:
      return <div className={`w-8 h-8 rounded-sm rotate-45 border-2 ${supported ? (active ? 'border-accent bg-accent/20' : 'border-white bg-white/10') : 'border-white/20 bg-white/5'}`} style={{ opacity }} />;
  }
};

export const SHAPE_OPTIONS = Object.values(SHAPE_DEFS).map(def => ({
  id: def.id,
  name: def.name,
  supported: def.enabled
}));

interface ShapesMenuOverlayProps {
  show: boolean;
  onClose: () => void;
  shapesMenuRef: React.RefObject<HTMLDivElement | null>;
}

const ShapesMenuOverlay = ({
  show,
  onClose,
  shapesMenuRef,
}: ShapesMenuOverlayProps) => {
  const selectedType = useLegoStore((state) => state.selectedType);
  const setSelectedType = useLegoStore((state) => state.setSelectedType);
  const loadPreset = useLegoStore((state) => state.loadPreset);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={shapesMenuRef}
          initial={{ opacity: 0, y: 200, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 200, x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/80 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] flex flex-col gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)] scroll-panel"
        >
          <div className="bg-blue-500/20 px-4 py-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-1 rounded-t-[19px] sm:rounded-t-[23px] border-b border-blue-500/30">
            <div className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
              Special Shapes
            </div>
          </div>
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {SHAPE_OPTIONS.map((shape) => (
              <button
                key={shape.id}
                disabled={!shape.supported}
                onClick={() => {
                  if (shape.supported) {
                    setSelectedType(shape.id as any);
                    loadPreset(null);
                    onClose();
                  }
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-2xl w-[90px] transition-colors flex-shrink-0 ${
                  !shape.supported
                    ? "bg-white/5 border-white/5 cursor-not-allowed"
                    : selectedType === shape.id
                    ? "bg-accent/20 border-accent/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className={`text-3xl flex items-center justify-center h-10 w-10 ${selectedType === shape.id ? 'text-accent' : 'text-white'}`}>
                  <ShapeIcon id={shape.id} active={selectedType === shape.id} supported={shape.supported} />
                </span>
                <div className="text-center w-full">
                  <div className={`text-[12px] font-bold leading-tight truncate ${!shape.supported ? 'text-white/40' : selectedType === shape.id ? 'text-white' : 'text-white/80'}`}>
                    {shape.name}
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

export default ShapesMenuOverlay;
