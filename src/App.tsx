import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'motion/react';
import { useLegoStore, LEGO_COLORS, BrickType, PresetName } from './Store';
import { Scene } from './components/Scene';
import { createXRStore } from '@react-three/xr';

const BuildIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14m-7-7h14"/>
  </svg>
);

const MoveIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"/>
  </svg>
);

const DeleteIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
  </svg>
);

const RotateIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const PresetsIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M3 14h7v7H3z" />
  </svg>
);

const TreeIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-8" />
    <path d="M7 14A6 6 0 0 1 12 4a6 6 0 0 1 5 10Z" />
  </svg>
);

const CabinIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const WellIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 14v8h12v-8" />
    <path d="M3 14h18" />
    <path d="M6 14V4" />
    <path d="M18 14V4" />
    <path d="M6 4h12" />
    <path d="M10 8l2 2 2-2" />
  </svg>
);

const PineIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-6" />
    <path d="M12 2L4 10h16z" />
    <path d="M12 8L2 16h20z" />
  </svg>
);

const CastleIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 20v-6h-2v4h-4v-4H8v4H4v-4H2v6h20z" />
    <path d="M4 14V4h4v3h2V4h6v3h2V4h4v10" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const InfoIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const HelpIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const PRESET_OPTIONS: { id: PresetName, icon: React.ReactNode, name: string, desc: string }[] = [
  { id: 'tree', icon: <TreeIcon size={32} />, name: 'Tree', desc: 'Classic oak' },
  { id: 'cabin', icon: <CabinIcon size={32} />, name: 'Cabin', desc: 'Small house' },
  { id: 'round_water_well', icon: <WellIcon size={32} />, name: 'Water Well', desc: 'Round stone' },
  { id: 'pine_tree', icon: <PineIcon size={32} />, name: 'Pine Tree', desc: 'Tall evergreen' },
  { id: 'walk_in_castle', icon: <CastleIcon size={32} />, name: 'Castle', desc: 'Walk-in fort' },
];

const xrStore = createXRStore({
  hand: true,
  controller: {
    rayPointer: {
      rayModel: {
        color: '#ff0000',
      }
    }
  },
});

const BRICK_TYPES: BrickType[] = ['1x1', '1x2', '2x2', '2x3', '2x4'];

export default function App() {
  const { 
    bricks, mode, setMode, 
    selectedType, setSelectedType,
    selectedColor, setSelectedColor,
    undo, redo, clearAll, setBricks,
    toastMessage
  } = useLegoStore();

  const [showHelp, setShowHelp] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => setShowPresetMenu(false);
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, []);

  // Load save on startup
  useEffect(() => {
    const saved = localStorage.getItem('brickxr-save');
    if (saved) {
      try {
        setBricks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'brickxr-screenshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleExportSTL = () => {
    // This is a simplified export. A real one would need to traverse the scene 
    // and extract meshes. Since we're in a browser app, we'll try to find 
    // all mesh objects in the scene.
    // In React Three Fiber, we'd ideally use a ref to the scene.
    // For this demo, we'll show the intent.
    alert("Exporting STL... (In a full app, this would merge geometries)");
  };

  const handlePunchAll = () => {
    // Signal to bricks to apply an impulse
    window.dispatchEvent(new CustomEvent('punch-all'));
  };

  return (
    <div className="w-full h-screen bg-bg text-white overflow-hidden font-sans relative viewport-gradient">
      {/* 3D Viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0.5, 0.5, 0.5], fov: 60 }}>
          <Scene xrStore={xrStore} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
        {toastMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600/90 border border-red-400 text-white px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] font-bold text-sm pointer-events-auto backdrop-blur-md flex items-center gap-2 z-50">
            <InfoIcon size={16} />
            {toastMessage}
          </div>
        )}
        
        {/* Top Bar */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="text-xl font-extrabold tracking-[2px] flex items-center gap-2">
            BRICK <span className="font-light opacity-60">XR</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                const xrErrorMsg = "VR not supported or no hardware found.";
                try {
                  const p = xrStore.enterVR();
                  if (p && p.catch) {
                    p.catch(() => alert(xrErrorMsg));
                  }
                } catch (e) {
                  alert(xrErrorMsg);
                }
              }} 
              className="bg-purple-600/80 backdrop-blur-md border border-purple-400/50 text-white px-5 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:bg-purple-500 transition-colors"
            >
              Enter VR
            </button>
            <div className="bg-green-500/20 border border-green-500/40 text-green-400 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center">
              WebXR Ready
            </div>
          </div>
        </div>

        {/* Center UI (Sidebars) */}
        <div className="flex justify-between items-center h-full sm:px-4 pointer-events-none">
          {/* Left Tools */}
          <div className="glass-panel w-16 p-3 rounded-2xl flex flex-col gap-4 pointer-events-auto">
            <ToolIconButton 
              icon={<BuildIcon size={24} />} 
              active={mode === 'Build'} 
              onClick={() => setMode('Build')} 
            />
            <ToolIconButton 
              icon={<MoveIcon size={24} />} 
              active={mode === 'Move'} 
              onClick={() => setMode('Move')} 
            />
            <ToolIconButton 
              icon={<DeleteIcon size={24} />} 
              active={mode === 'Delete'} 
              onClick={() => setMode('Delete')} 
            />
            <ToolIconButton 
              icon={<RotateIcon size={24} />} 
              active={false} 
              onClick={() => window.dispatchEvent(new CustomEvent('rotate-ghost'))} 
            />
          </div>

          {/* Right Colors */}
          <div className="glass-panel w-16 p-3 rounded-2xl flex flex-col gap-3 items-center pointer-events-auto">
            {LEGO_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                  selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Toolbar Area */}
        <div className="flex flex-col items-center gap-6 pointer-events-none">
          {/* Brick Type Selector (Build Mode Only) */}
          <AnimatePresence>
            {mode === 'Build' && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="glass-panel p-2 rounded-2xl pointer-events-auto flex gap-1 shadow-2xl"
              >
                {BRICK_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                      selectedType === type 
                        ? 'bg-accent text-white' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Actions */}
          <div className="glass-panel w-full max-w-3xl p-4 rounded-[20px] flex justify-between items-center pointer-events-auto shadow-2xl">
            <div className="flex gap-3">
              <button onClick={undo} className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors">
                Undo
              </button>
              <button onClick={redo} className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors">
                Redo
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePunchAll} className="text-orange-400 hover:text-orange-300 px-3 py-2 text-[13px] font-semibold transition-colors">
                Punch
              </button>
              <button onClick={clearAll} className="text-red-400 hover:text-red-300 px-3 py-2 text-[13px] font-semibold transition-colors">
                Clear
              </button>
              <div className="w-px h-6 bg-glass-border self-center" />
              <div className="relative flex items-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPresetMenu(!showPresetMenu);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-emerald-400 hover:text-emerald-300 px-3 py-2 text-[13px] font-semibold transition-colors flex items-center gap-1"
                >
                  <PresetsIcon size={16} /> Presets
                </button>
                <AnimatePresence>
                  {showPresetMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, x: '-50%' }}
                      animate={{ opacity: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, y: 10, x: '-50%' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute bottom-[calc(100%+16px)] left-1/2 bg-black/90 border border-white/20 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl z-50 flex gap-3 pointer-events-auto overflow-x-auto min-w-max max-w-[90vw]"
                    >
                      {PRESET_OPTIONS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            useLegoStore.getState().loadPreset(preset.id);
                            setShowPresetMenu(false);
                          }}
                          className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
                        >
                          <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">{preset.icon}</span>
                          <div className="text-center w-full">
                            <div className="text-[12px] font-bold text-white leading-tight truncate">{preset.name}</div>
                            <div className="text-[10px] text-white/50 leading-tight mt-1 px-1">{preset.desc}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-6 bg-glass-border self-center" />
              <button onClick={handleScreenshot} className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors">
                Screenshot
              </button>
              <button onClick={handleExportSTL} className="bg-accent border border-white/20 px-6 py-2.5 rounded-xl text-[13px] font-semibold hover:brightness-110 transition-all shadow-xl">
                Export STL
              </button>
              <button onClick={() => setShowHelp(true)} className="p-2 text-white/40 hover:text-white transition-colors">
                <HelpIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Intro Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-black/95 border border-glass-border p-10 rounded-[32px] max-w-md w-full text-center shadow-2xl relative"
            >
              <h2 className="text-4xl font-light mb-3">Immersive Building</h2>
              <p className="text-white/60 mb-8 leading-relaxed text-[15px]">
                Pinch to grab and snap bricks to the spatial grid. Use your left hand to select colors and right hand to change building tools.
              </p>
              
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-2xl"
              >
                Enter Workspace
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolIconButton({ icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
        active ? 'bg-accent border-white/40 shadow-lg' : 'border-transparent text-white/70 hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon, { size: 20 })}
    </button>
  );
}

