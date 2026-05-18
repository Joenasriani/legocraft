import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Home, Castle, Bot, GitCommit, DoorOpen } from "lucide-react";

interface BuildIdea {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  tips: string[];
  essentialBricks: { type: string; count: number; color: string }[];
}

const BUILD_IDEAS: BuildIdea[] = [
  {
    id: "small-house",
    name: "Small House",
    description: "A cozy starter home with a red roof.",
    icon: Home,
    essentialBricks: [
      { type: "2x4", count: 8, color: "#E3000B" },
      { type: "1x2_slope", count: 6, color: "#BF0009" },
      { type: "1x1", count: 4, color: "#0055BF" },
      { type: "arch", count: 1, color: "#FFFFFF" }
    ],
    tips: [
      "Use 2x4 bricks for the main walls",
      "Try the 1x2_slope bricks for a realistic roof",
      "Add a small 1x1_round_cylinder for a chimney",
      "Combine white and brown for a classic look"
    ]
  },
  {
    id: "tower",
    name: "High Tower",
    description: "Reach for the clouds with a sturdy spire.",
    icon: Castle,
    essentialBricks: [
      { type: "2x2", count: 12, color: "#A0A0A0" },
      { type: "2x2_cone", count: 1, color: "#000000" },
      { type: "1x2", count: 6, color: "#808080" },
      { type: "2x2_dome", count: 1, color: "#E3000B" }
    ],
    tips: [
      "Stack 2x2 bricks for a stable square base",
      "Use smaller bricks as you go higher for a tapered look",
      "Add 'windows' by leaving small gaps or using different colors",
      "Try adding a 2x2_dome at the very top"
    ]
  },
  {
    id: "robot-head",
    name: "Robot Head",
    description: "A mechanical friend with blinking 'eyes'.",
    icon: Bot,
    essentialBricks: [
      { type: "4x4", count: 2, color: "#C0C0C0" },
      { type: "1x1_round_cylinder", count: 2, color: "#00FF00" },
      { type: "1x1", count: 4, color: "#404040" },
      { type: "1x1_cone", count: 2, color: "#FFFF00" }
    ],
    tips: [
      "Start with a 4x4 or 3x3 base for the head",
      "Use 1x1_round_cylinder for the eyes",
      "Add 'antennas' using 1x1_cone on top",
      "Experiment with neon colors like Yellow or Green"
    ]
  },
  {
    id: "bridge",
    name: "Bridge",
    description: "Connect two points with a graceful span.",
    icon: GitCommit,
    essentialBricks: [
      { type: "2x4", count: 10, color: "#804000" },
      { type: "1x1", count: 8, color: "#A0A0A0" },
      { type: "1x3", count: 4, color: "#606060" }
    ],
    tips: [
      "Build two separate towers first",
      "Use long 2x4 bricks to bridge the gap",
      "Add railings using 1x1 bricks in a line",
      "Try building an arch structure underneath for support"
    ]
  },
  {
    id: "archway",
    name: "Grand Arch",
    description: "An elegant entrance for your creations.",
    icon: DoorOpen,
    essentialBricks: [
      { type: "arch", count: 2, color: "#FFFFFF" },
      { type: "1x2", count: 6, color: "#FFFFFF" },
      { type: "2x2_corner_triangle", count: 2, color: "#E3000B" }
    ],
    tips: [
      "Build two columns 4 modules apart",
      "Use the 'arch' special brick to connect the top",
      "Add decorative studs on the corners",
      "Make it look like a castle gate with Gray bricks"
    ]
  }
];

export const BuildIdeas = ({ show, onClose }: { show: boolean; onClose: () => void }) => {
  const [selectedIdea, setSelectedIdea] = React.useState<BuildIdea | null>(null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8 pointer-events-auto"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Build Ideas</h2>
                <p className="text-white/50 text-sm mt-1">Inspiration for your next masterpiece</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 scroll-panel">
              {!selectedIdea ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {BUILD_IDEAS.map((idea) => (
                    <motion.div
                      key={idea.id}
                      whileHover={{ scale: 1.02, translateY: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedIdea(idea)}
                      className="bg-white/5 border border-white/10 rounded-[28px] cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group overflow-hidden flex flex-col p-6"
                    >
                      <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
                        <idea.icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{idea.name}</h3>
                      <p className="text-white/50 text-sm line-clamp-2">{idea.description}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {/* Detail View */}
                  <div className="flex-1">
                    <button 
                      onClick={() => setSelectedIdea(null)}
                      className="mb-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
                    >
                      <X size={16} /> Back to all ideas
                    </button>
                    
                    <div className="flex items-center gap-5 mb-8">
                       <div className="w-16 h-16 bg-accent/20 rounded-[22px] flex items-center justify-center text-accent">
                        <selectedIdea.icon size={36} />
                      </div>
                      <div>
                        <h3 className="text-4xl font-bold tracking-tight">{selectedIdea.name}</h3>
                        <p className="text-white/60 text-lg">{selectedIdea.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <section>
                        <h4 className="text-accent font-bold uppercase tracking-wider text-[10px] mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                          Construction Tips
                        </h4>
                        <ul className="space-y-4">
                          {selectedIdea.tips.map((tip, i) => (
                            <li key={i} className="flex gap-4 text-white/80 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                              <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 mt-0.5 border border-white/10 flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-sm leading-relaxed">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h4 className="text-accent font-bold uppercase tracking-wider text-[10px] mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                          Suggested Parts
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedIdea.essentialBricks.map((brick, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                              <div 
                                className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center relative overflow-hidden" 
                                style={{ backgroundColor: brick.color }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                <span className="text-[10px] font-bold text-black/40 z-10">{brick.type}</span>
                              </div>
                              <div>
                                <div className="text-[10px] text-white/40 font-bold uppercase">x{brick.count}</div>
                                <div className="text-xs font-medium text-white/80">{brick.type}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[32px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white/40">
                         <selectedIdea.icon size={24} />
                      </div>
                      <p className="text-sm text-white/60 max-w-sm">
                        Use these tips as a starting point. Feel free to mix colors and add your own unique flair!
                      </p>
                    </div>
                    <button 
                      onClick={onClose}
                      className="whitespace-nowrap px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-accent hover:text-white transition-all transform hover:scale-[1.02] shadow-xl"
                    >
                      Close & Start Building
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
