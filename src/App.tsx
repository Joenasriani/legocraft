import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "motion/react";
import { useLegoStore, LEGO_COLORS, BrickType, PresetName } from "./Store";
import { Scene } from "./components/Scene";
import { createXRStore } from "@react-three/xr";

const BuildIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14m-7-7h14" />
  </svg>
);

const MoveIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20" />
  </svg>
);

const DeleteIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
  </svg>
);

const RotateIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const PresetsIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M3 14h7v7H3z" />
  </svg>
);

const PanIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 11V6a2 2 0 0 0-4 0v4" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V5a2 2 0 0 0-4 0v9" />
    <path d="M6 13v-1a2 2 0 0 0-4 0v5c0 3.3 2.7 6 6 6h2c3 0 5-1.7 6-4l2-4" />
  </svg>
);

const ZoomIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const OrbitCameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.7 9.7 0 0 0-6.7 2.7" />
    <path d="M3 12a9 9 0 0 0 9 9 9.7 9.7 0 0 0 6.7-2.7" />
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
  </svg>
);

const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const TreeIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22v-8" />
    <path d="M7 14A6 6 0 0 1 12 4a6 6 0 0 1 5 10Z" />
  </svg>
);

const CabinIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const WellIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 14v8h12v-8" />
    <path d="M3 14h18" />
    <path d="M6 14V4" />
    <path d="M18 14V4" />
    <path d="M6 4h12" />
    <path d="M10 8l2 2 2-2" />
  </svg>
);

const PineIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22v-6" />
    <path d="M12 2L4 10h16z" />
    <path d="M12 8L2 16h20z" />
  </svg>
);

const CastleIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 20v-6h-2v4h-4v-4H8v4H4v-4H2v6h20z" />
    <path d="M4 14V4h4v3h2V4h6v3h2V4h4v10" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const InfoIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const HelpIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const HorseIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 19v-4.5c0-1.7 1.4-3 3-3h1.5l1.6-4.8c.2-.7 1.1-.9 1.6-.4l3.3 3.3c.6.6 1.1 1.4 1 2.3v7.1" />
    <path d="M15 19v-4.5" />
    <path d="M20 10l-4 4" />
    <path d="M4 14l5-5" />
  </svg>
);

const SheepIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.5 16v4" />
    <path d="M18.5 16v4" />
    <path d="M8.5 16v4" />
    <path d="M5.5 16v4" />
    <path d="M4 10.5h1.5a3 3 0 0 0 3-3V7c0-2.2 1.8-4 4-4h.5c2.2 0 4 1.8 4 4v.5a3 3 0 0 0 3 3H20c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2Z" />
  </svg>
);

const CarIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M9 17h6" />
  </svg>
);

const RoadIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22L10 2" />
    <path d="M20 22L14 2" />
    <path d="M12 22v-3" />
    <path d="M12 15v-3" />
    <path d="M12 8V5" />
  </svg>
);

const MountainIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
  </svg>
);

const PRESET_OPTIONS: {
  id: PresetName;
  icon: React.ReactNode;
  name: string;
  desc: string;
}[] = [
  {
    id: "horse",
    icon: <HorseIcon size={32} />,
    name: "Horse",
    desc: "Large mount",
  },
  {
    id: "sheep",
    icon: <SheepIcon size={32} />,
    name: "Sheep",
    desc: "Woolly friend",
  },
  { id: "car", icon: <CarIcon size={32} />, name: "Car", desc: "4 wheels" },
  {
    id: "road",
    icon: <RoadIcon size={32} />,
    name: "Road",
    desc: "Tileable path",
  },
  {
    id: "mountain",
    icon: <MountainIcon size={32} />,
    name: "Mountain",
    desc: "Background hill",
  },
  {
    id: "tree",
    icon: <TreeIcon size={32} />,
    name: "Tree",
    desc: "Classic oak",
  },
  {
    id: "cabin",
    icon: <CabinIcon size={32} />,
    name: "Cabin",
    desc: "Small house",
  },
  {
    id: "round_water_well",
    icon: <WellIcon size={32} />,
    name: "Water Well",
    desc: "Round stone",
  },
  {
    id: "pine_tree",
    icon: <PineIcon size={32} />,
    name: "Pine Tree",
    desc: "Tall evergreen",
  },
  {
    id: "walk_in_castle",
    icon: <CastleIcon size={32} />,
    name: "Castle",
    desc: "Walk-in fort",
  },
];

const xrStore = createXRStore({
  hand: true,
  controller: {
    rayPointer: {
      rayModel: {
        color: "#ff0000",
      },
    },
  },
});

const BRICK_TYPES: BrickType[] = ["1x1", "1x2", "2x2", "2x3", "2x4"];

export default function App() {
  const {
    bricks,
    mode,
    setMode,
    cameraMode,
    setCameraMode,
    selectedType,
    setSelectedType,
    selectedColor,
    setSelectedColor,
    undo,
    redo,
    clearAll,
    setBricks,
    toastMessage,
    activePreset,
    loadPreset,
    selectionMode,
    setSelectionMode,
    isCameraLocked,
    setIsCameraLocked,
  } = useLegoStore();

  const [showHelp, setShowHelp] = useState(true);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [vrStatus, setVrStatus] = useState<"pending" | "ready" | "unsupported">(
    "pending",
  );

  useEffect(() => {
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
        setVrStatus(supported ? "ready" : "unsupported");
      });
    } else {
      setVrStatus("unsupported");
    }
    const handleGlobalClick = () => setShowPresetMenu(false);
    window.addEventListener("pointerdown", handleGlobalClick);
    return () => window.removeEventListener("pointerdown", handleGlobalClick);
  }, []);

  // Load save on startup
  useEffect(() => {
    const saved = localStorage.getItem("brickxr-save");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Not an array");

        let isValid = true;
        for (const item of parsed) {
          if (!item || typeof item !== "object") isValid = false;
          else if (typeof item.id !== "string") isValid = false;
          else if (!BRICK_TYPES.includes(item.type)) isValid = false;
          else if (typeof item.color !== "string") isValid = false;
          else if (
            !Array.isArray(item.position) ||
            item.position.length !== 3 ||
            !item.position.every(
              (n: any) => typeof n === "number" && Number.isFinite(n),
            )
          )
            isValid = false;
          else if (
            typeof item.rotation !== "number" ||
            !Number.isFinite(item.rotation)
          )
            isValid = false;

          if (!isValid) break;
        }

        if (isValid) {
          setBricks(parsed);
        } else {
          throw new Error("Invalid save data format");
        }
      } catch (e) {
        console.error("Failed to load save", e);
        useLegoStore
          .getState()
          .setToastMessage(
            "Saved build could not be loaded, so a fresh scene was started.",
          );
        setTimeout(() => useLegoStore.getState().setToastMessage(null), 4000);
      }
    }
  }, []);

  const handleScreenshot = () => {
    window.dispatchEvent(new CustomEvent("take-screenshot"));
  };

  return (
    <div className="w-full h-screen bg-bg text-white overflow-hidden font-sans relative viewport-gradient">
      {/* 3D Viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [2.8, 2.2, 3.2], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
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

        {/* Camera Modes */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-auto bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10">
          <button
            onClick={() => {
              if (mode === "Build" || mode === "Delete") {
                useLegoStore.getState().setToastMessage("Use Move mode to pan, zoom, or orbit the camera.");
                setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                return;
              }
              setCameraMode("Pan");
              setIsCameraLocked(false);
            }}
            className={`p-1.5 rounded-md transition-colors ${(mode !== "Build" && mode !== "Delete") && !isCameraLocked && cameraMode === "Pan" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
            title="Pan Camera"
          >
            <PanIcon size={16} />
          </button>
          <button
            onClick={() => {
              if (mode === "Build" || mode === "Delete") {
                useLegoStore.getState().setToastMessage("Use Move mode to pan, zoom, or orbit the camera.");
                setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                return;
              }
              setCameraMode("Zoom");
              setIsCameraLocked(false);
            }}
            className={`p-1.5 rounded-md transition-colors ${(mode !== "Build" && mode !== "Delete") && !isCameraLocked && cameraMode === "Zoom" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
            title="Zoom Camera"
          >
            <ZoomIcon size={16} />
          </button>
          <button
            onClick={() => {
              if (mode === "Build" || mode === "Delete") {
                useLegoStore.getState().setToastMessage("Use Move mode to pan, zoom, or orbit the camera.");
                setTimeout(() => useLegoStore.getState().setToastMessage(null), 3000);
                return;
              }
              setCameraMode("Orbit");
              setIsCameraLocked(false);
            }}
            className={`p-1.5 rounded-md transition-colors ${(mode !== "Build" && mode !== "Delete") && !isCameraLocked && cameraMode === "Orbit" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
            title="Orbit Camera"
          >
            <OrbitCameraIcon size={16} />
          </button>
          <div className="w-[1px] h-[20px] bg-white/20 mx-0.5"></div>
          <button
            onClick={() => setIsCameraLocked(!isCameraLocked)}
            className={`p-1.5 rounded-md transition-colors ${isCameraLocked ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
            title="Lock Camera"
          >
            <LockIcon size={16} />
          </button>
        </div>

        {/* Top Bar */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="text-xl font-extrabold tracking-[2px] flex items-center gap-2">
            BRICK <span className="font-light opacity-60">XR</span>
          </div>
          <div className="flex gap-4">
            {vrStatus === "ready" && (
              <button
                onClick={() => {
                  const xrErrorMsg = "VR not supported or no hardware found.";
                  try {
                    const p = xrStore.enterVR();
                    if (p && p.catch) {
                      p.catch(() => useLegoStore.getState().setToastMessage("VR failed to start."));
                    }
                  } catch (e) {
                    useLegoStore.getState().setToastMessage("VR failed to start.");
                  }
                }}
                className="bg-purple-600/80 backdrop-blur-md border border-purple-400/50 text-white px-5 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:bg-purple-500 transition-colors"
                title="Enter VR Session"
              >
                Enter VR
              </button>
            )}
            <div
              className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center border ${
                vrStatus === "ready"
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : vrStatus === "pending"
                    ? "bg-gray-500/20 border-gray-500/40 text-gray-400"
                    : "bg-red-500/20 border-red-500/40 text-red-400"
              }`}
            >
              {vrStatus === "ready"
                ? "VR Ready"
                : vrStatus === "pending"
                  ? "Checking VR..."
                  : "Open in Quest Browser for VR"}
            </div>
          </div>
        </div>

        {/* Center UI (Sidebars) */}
        <div className="flex justify-between items-center h-full sm:px-4 pointer-events-none">
          {/* Left Tools */}
          <div className="glass-panel w-20 p-3 rounded-2xl flex flex-col items-center gap-3 pointer-events-auto">
            <ToolIconButton
              icon={<BuildIcon size={24} />}
              active={mode === "Build"}
              onClick={() => setMode("Build")}
              title="Build Mode"
            />
            <ToolIconButton
              icon={<MoveIcon size={24} />}
              active={mode === "Move"}
              onClick={() => setMode("Move")}
              title="Move Mode"
            />
            <ToolIconButton
              icon={<RotateIcon size={24} />}
              active={false}
              onClick={() =>
                window.dispatchEvent(new CustomEvent("rotate-ghost"))
              }
              title="Rotate Brick"
            />
            <ToolIconButton
              icon={<DeleteIcon size={24} />}
              active={mode === "Delete"}
              onClick={() => setMode("Delete")}
              title="Delete Mode"
            />

            {(mode === "Move" || mode === "Delete") && (
              <>
                <div className="w-10 h-px bg-white/10 my-1" />
                <button
                  onClick={() =>
                    setSelectionMode(
                      selectionMode === "Single" ? "Group" : "Single",
                    )
                  }
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                    selectionMode === "Group"
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                  title="Toggle Group Selection Mode"
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider leading-tight">
                    {selectionMode}
                  </div>
                  <div className="text-[9px] opacity-70">Mode</div>
                </button>
              </>
            )}
          </div>

          {/* Right Colors */}
          <div className="glass-panel w-16 p-3 rounded-2xl flex flex-col gap-3 items-center pointer-events-auto">
            {LEGO_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm ${
                  selectedColor === color
                    ? "border-white scale-110 shadow-md ring-2 ring-white/20"
                    : "border-white/10 opacity-80 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                title={`Select color: ${color}`}
                aria-label={`Select color: ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Toolbar Area */}
        <div className="flex flex-col items-center gap-6 pointer-events-none">
          {/* Brick Type Selector (Build Mode Only) */}
          <AnimatePresence>
            {mode === "Build" && !activePreset && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="glass-panel p-2 rounded-2xl pointer-events-auto flex gap-1 shadow-2xl"
              >
                {BRICK_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                      selectedType === type
                        ? "bg-accent text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    title={`Select brick type: ${type}`}
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}

            {mode === "Build" && activePreset && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="glass-panel p-2 rounded-2xl pointer-events-auto flex items-center gap-4 shadow-2xl px-6 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-400">
                    Placing Preset
                  </span>
                  <span className="text-xs text-white/60">
                    Click to stamp, drag to position
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <button
                  onClick={() => loadPreset(null)}
                  className="bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border border-red-500/30"
                >
                  Cancel Preset
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Actions */}
          <div className="glass-panel w-full max-w-3xl p-4 rounded-[20px] flex justify-between items-center pointer-events-auto shadow-2xl">
            <div className="flex gap-3">
              <button
                onClick={undo}
                title="Undo"
                className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors"
              >
                Undo
              </button>
              <button
                onClick={redo}
                title="Redo"
                className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors"
              >
                Redo
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (bricks.length === 0) {
                    useLegoStore
                      .getState()
                      .setToastMessage("Nothing to clear.");
                  } else {
                    setShowClearConfirm(true);
                  }
                }}
                title="Clear all bricks"
                className="text-red-400 hover:text-red-300 px-3 py-2 text-[13px] font-semibold transition-colors"
              >
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
                  title="Toggle Presets Menu"
                  className="text-emerald-400 hover:text-emerald-300 px-3 py-2 text-[13px] font-semibold transition-colors flex items-center gap-1"
                >
                  <PresetsIcon size={16} /> Presets
                </button>
                <AnimatePresence>
                  {showPresetMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, y: 10, x: "-50%" }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute bottom-[calc(100%+16px)] left-1/2 bg-black/90 border border-white/20 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl z-50 grid grid-cols-5 gap-3 pointer-events-auto overflow-x-auto min-w-max max-w-[90vw] sm:overflow-visible"
                    >
                      {PRESET_OPTIONS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            if (
                              useLegoStore.getState().activePreset === preset.id
                            ) {
                              useLegoStore.getState().loadPreset(null);
                            } else {
                              useLegoStore.getState().loadPreset(preset.id);
                            }
                            setShowPresetMenu(false);
                          }}
                          title={`Place ${preset.name} Preset`}
                          className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
                        >
                          <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">
                            {preset.icon}
                          </span>
                          <div className="text-center w-full">
                            <div className="text-[12px] font-bold text-white leading-tight truncate">
                              {preset.name}
                            </div>
                            <div className="text-[10px] text-white/50 leading-tight mt-1 px-1">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-6 bg-glass-border self-center" />
              <button
                onClick={handleScreenshot}
                title="Capture Screenshot"
                className="bg-white/5 border border-glass-border px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/10 transition-colors"
              >
                Screenshot
              </button>
              <button
                onClick={() => setShowHelp(true)}
                title="Show Help"
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
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
                Welcome to Brick XR. Build, move, and rotate your bricks using
                the UI tools. VR mode allows you to explore your creations
                immersively.
              </p>

              <button
                onClick={() => setShowHelp(false)}
                title="Enter Workspace"
                className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-2xl"
              >
                Enter Workspace
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 pointer-events-auto backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              className="glass-panel p-6 rounded-2xl max-w-sm w-[90%] flex flex-col items-center text-center shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Clear all bricks?</h3>
              <p className="text-white/70 text-sm mb-6">This can be undone.</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearAll();
                    setShowClearConfirm(false);
                    useLegoStore.getState().setToastMessage("Build cleared.");
                  }}
                  className="flex-1 bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 hover:text-red-200 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolIconButton({ icon, active, onClick, title }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[60px] h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
        active
          ? "bg-accent border-white/40 shadow-lg text-white"
          : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {React.cloneElement(icon, { size: 22 })}
      <span className="text-[10px] mt-1 font-semibold">
        {title.replace(" Mode", "").replace(" Brick", "")}
      </span>
    </button>
  );
}
