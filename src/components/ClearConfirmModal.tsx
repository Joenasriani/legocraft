import { motion, AnimatePresence } from "motion/react";

interface ClearConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ClearConfirmModal = ({
  show,
  onClose,
  onConfirm,
}: ClearConfirmModalProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="clear-confirm-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/60 pointer-events-auto backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-[90%] flex flex-col items-center text-center shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-2 text-white">
              Clear all bricks?
            </h3>
            <p className="text-white/70 text-sm mb-6">
              This cannot be undone. Clearing the scene will remove all bricks from the current workspace.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 hover:text-red-200 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClearConfirmModal;
