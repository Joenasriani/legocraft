import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { STLExporter } from 'three-stdlib';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Move, Trash2, Undo2, Redo2, 
  Trash, Zap, Camera, Download, HelpCircle, 
  X, Save, FileJson, Info
} from 'lucide-react';
import { useLegoStore, LEGO_COLORS, BrickType } from './Store';
import { Scene } from './components/Scene';
import { createXRStore } from '@react-three/xr';

import { createXRStore } from '@react-three/xr';

const xrStore = createXRStore({
  hand: true,
  controller: true,
});

const BRICK_TYPES: BrickType[] = ['1x1', '1x2', '2x2', '2x3', '2x4'];

export default function App() {
  const { 
    bricks, mode, setMode, 
    selectedType, setSelectedType,
    selectedColor, setSelectedColor,
    undo, redo, clearAll, setBricks
  } = useLegoStore();

  const [showHelp, setShowHelp] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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
        
        {/* Top Bar */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="text-xl font-extrabold tracking-[2px] flex items-center gap-2">
            BRICK <span className="font-light opacity-60">XR</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => xrStore.enterVR()} 
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
              icon={<Plus size={24} />} 
              active={mode === 'Build'} 
              onClick={() => setMode('Build')} 
            />
            <ToolIconButton 
              icon={<Move size={24} />} 
              active={mode === 'Move'} 
              onClick={() => setMode('Move')} 
            />
            <ToolIconButton 
              icon={<Trash2 size={24} />} 
              active={mode === 'Delete'} 
              onClick={() => setMode('Delete')} 
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
              <button onClick={() => {
                // simple 90deg rotation of the ghost brick by updating a local state
                window.dispatchEvent(new CustomEvent('rotate-ghost'));
              }} className="text-blue-400 hover:text-blue-300 px-3 py-2 text-[13px] font-semibold transition-colors">
                Rotate Brick
              </button>
              <div className="w-px h-6 bg-glass-border self-center" />
              <button onClick={handlePunchAll} className="text-orange-400 hover:text-orange-300 px-3 py-2 text-[13px] font-semibold transition-colors">
                Punch
              </button>
              <button onClick={clearAll} className="text-red-400 hover:text-red-300 px-3 py-2 text-[13px] font-semibold transition-colors">
                Clear
              </button>
              <div className="w-px h-6 bg-glass-border self-center" />
              <button onClick={handleScreenshot} className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors">
                Screenshot
              </button>
              <button onClick={handleExportSTL} className="bg-accent border border-white/20 px-6 py-2.5 rounded-xl text-[13px] font-semibold hover:brightness-110 transition-all shadow-xl">
                Export STL
              </button>
              <button onClick={() => setShowHelp(true)} className="p-2 text-white/40 hover:text-white transition-colors">
                <HelpCircle size={20} />
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

