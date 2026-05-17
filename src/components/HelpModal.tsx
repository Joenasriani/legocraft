import { motion, AnimatePresence } from "motion/react";

interface HelpModalProps {
  show: boolean;
  onClose: () => void;
}

const HelpModal = ({ show, onClose }: HelpModalProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-black/95 border border-white/20 p-10 rounded-[32px] max-w-md w-full text-center shadow-2xl relative"
          >
            <h2 className="text-4xl font-light mb-3">Immersive Building</h2>
            <p className="text-white/60 mb-8 leading-relaxed text-[15px]">
              Welcome to Brick XR. Build, move, and rotate your bricks using the
              UI tools. VR mode allows you to explore your creations
              immersively.
            </p>

            <button
              onClick={onClose}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-2xl"
            >
              Enter Workspace
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
