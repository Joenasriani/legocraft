import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "motion/react";
import {
  useLegoStore,
  LEGO_COLORS,
  BRICK_TYPES,
  PresetName,
  getGroupBricks,
  isValidBrickData,
  SHAPE_DEFS,
} from "./Store";
import { createXRStore } from "@react-three/xr";
import { Undo2 as LucideUndo2, Redo2 as LucideRedo2, Blocks as LucideBlocks, Shapes as LucideShapes, LayoutGrid as LucideLayoutGrid, Trash2 as LucideTrash2, Lightbulb as LucideLightbulb } from "lucide-react";

const Scene = lazy(() =>
  import("./components/Scene").then((m) => ({ default: m.Scene })),
);
const HelpModal = lazy(() => import("./components/HelpModal"));
const ClearConfirmModal = lazy(() => import("./components/ClearConfirmModal"));
const PresetMenuOverlay = lazy(() => import("./components/PresetMenuOverlay"));
const BuildIdeas = lazy(() =>
  import("./components/BuildIdeas").then((m) => ({ default: m.BuildIdeas })),
);

const BuildIcon = ({ size = 24 }: { size?: number }) => <LucideBlocks size={size} strokeWidth={2} />;

const EyeIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const HomeIcon = ({ size = 16 }: { size?: number }) => (
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
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
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

const PresetsIcon = ({ size = 24 }: { size?: number }) => <LucideLayoutGrid size={size} strokeWidth={2} />;

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

const ZoomInIcon = ({ size = 16 }: { size?: number }) => (
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
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = ({ size = 16 }: { size?: number }) => (
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
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
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

const UndoIcon = ({ size = 24 }: { size?: number }) => <LucideUndo2 size={size} strokeWidth={2} />;

const RedoIcon = ({ size = 24 }: { size?: number }) => <LucideRedo2 size={size} strokeWidth={2} />;

const SaveIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const LoadIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ExportIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ClearIcon = ({ size = 24 }: { size?: number }) => <LucideTrash2 size={size} strokeWidth={2} />;

const ScreenshotIcon = ({ size = 24 }: { size?: number }) => (
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
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ShapesIcon = ({ size = 24 }: { size?: number }) => <LucideShapes size={size} strokeWidth={2} />;

export const HorseIcon = ({ size = 24 }: { size?: number }) => (
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
    case "3x3_cone":
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <ellipse cx="12" cy="6" rx="2" ry="1" />
           <path d="M10 6l-4 12c-0.2 0.5 4 1.5 6 1.5s6.2-1 6-1.5l-4-12" />
        </svg>
      );
    case "2x2_dome":
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
    case "quarter_dome":
      return (
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} style={{ opacity }}>
           <path d="M4 20 A 16 16 0 0 1 20 4 V20 H4 Z" fill={color} fillOpacity="0.2"/>
           <path d="M4 20 A 16 16 0 0 1 20 4 V20 H4 Z" />
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

export const PRESET_OPTIONS: {
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

const isQuest =
  typeof navigator !== "undefined" &&
  /Quest|OculusBrowser/i.test(navigator.userAgent);
const isQuest3 =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Quest 3");

const xrStore = createXRStore({
  emulate: false,
  frameRate: isQuest3 ? "high" : isQuest ? "mid" : "high",
  frameBufferScaling: isQuest3 ? "high" : isQuest ? "low" : "high",
  layers: false,
  anchors: false,
  meshDetection: false,
  planeDetection: false,
  hitTest: false,
  domOverlay: false,
  hand: false, // Hand tracking disabled (unimplemented)
  screenInput: false,
  transientPointer: false,
  controller: { rayPointer: false, teleportPointer: false, grabPointer: false }, // Disables library pointers but enables standard controller models because we use our custom VRViewLayers
  customSessionInit: { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor"] },
});

const SaveExportMenuOverlay = ({
  show,
  onClose,
  saveMenuRef,
  onSaveProject,
  onExportGLB,
  onScreenshot,
}: {
  show: boolean;
  onClose: () => void;
  saveMenuRef: React.RefObject<HTMLDivElement>;
  onSaveProject: () => void;
  onExportGLB: () => void;
  onScreenshot: () => void;
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={saveMenuRef}
          initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/90 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] flex gap-2 sm:gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)] scroll-panel"
        >
          <button
            onClick={() => {
              onSaveProject();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
          >
            <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">
              <SaveIcon size={32} />
            </span>
            <div className="text-center w-full">
              <div className="text-[12px] font-bold text-white leading-tight truncate">
                Save Project
              </div>
              <div className="text-[10px] text-white/50 leading-tight mt-1 px-1 line-clamp-2">
                .json
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onExportGLB();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
            title="Exports the current structure to a GLTF file for use in other 3D applications."
          >
            <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">
               <ExportIcon size={32} />
            </span>
            <div className="text-center w-full">
              <div className="text-[12px] font-bold text-white leading-tight truncate">
                Export 3D
              </div>
              <div className="text-[10px] text-white/50 leading-tight mt-1 px-1 line-clamp-2">
                .glb
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onScreenshot();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl w-[90px] transition-colors flex-shrink-0"
            title="Saves a screenshot of your current build."
          >
            <span className="text-3xl flex items-center justify-center h-10 w-10 text-white">
               <ScreenshotIcon size={32} />
            </span>
            <div className="text-center w-full">
              <div className="text-[12px] font-bold text-white leading-tight truncate">
                Screenshot
              </div>
              <div className="text-[10px] text-white/50 leading-tight mt-1 px-1 line-clamp-2">
                .png
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  useEffect(() => {
    console.log(
      "[Brick XR Builder] Build verification - App started at " +
        new Date().toISOString(),
    );
  }, []);

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
    undoStack,
    redoStack,
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

  const [showHelp, setShowHelp] = useState(() => {
    return localStorage.getItem("brickxr-help-dismissed") !== "true";
  });
  const [showBuildIdeas, setShowBuildIdeas] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const presetMenuRef = React.useRef<HTMLDivElement>(null);
  const [showBrickMenu, setShowBrickMenu] = useState(false);
  const brickMenuRef = React.useRef<HTMLDivElement>(null);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const shapesMenuRef = React.useRef<HTMLDivElement>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const saveMenuRef = React.useRef<HTMLDivElement>(null);
  const sKeyTracker = useRef<{ count: number, timeout: any }>({ count: 0, timeout: null });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showVRPrompt, setShowVRPrompt] = useState(false);
  const [isFadingToVR, setIsFadingToVR] = useState(false);
  const [vrStatus, setVrStatus] = useState<
    "pending" | "ready" | "unsupported" | "https-required" | "no-xr" | "denied"
  >("pending");
  const [isXRActive, setIsXRActive] = useState(false);
  const [xrError, setXrError] = useState<string | null>(null);
  const [uiVisible, setUiVisible] = useState(true);

  useEffect(() => {
    return xrStore.subscribe((state: any) => {
      setIsXRActive(!!state.session);
    });
  }, []);

  useEffect(() => {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setVrStatus("https-required");
      return;
    }

    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr
        .isSessionSupported("immersive-vr")
        .then((supported) => {
          setVrStatus(supported ? "ready" : "unsupported");
        })
        .catch((err) => {
          console.warn("isSessionSupported rejected, likely iframe policy:", err);
          setVrStatus("unsupported");
        });
    } else {
      setVrStatus("no-xr");
    }
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      if (
        showPresetMenu &&
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setShowPresetMenu(false);
      }
      if (
        showBrickMenu &&
        brickMenuRef.current &&
        !brickMenuRef.current.contains(e.target as Node)
      ) {
        setShowBrickMenu(false);
      }
      if (
        showShapesMenu &&
        shapesMenuRef.current &&
        !shapesMenuRef.current.contains(e.target as Node)
      ) {
        setShowShapesMenu(false);
      }
      if (
        showSaveMenu &&
        saveMenuRef.current &&
        !saveMenuRef.current.contains(e.target as Node)
      ) {
        setShowSaveMenu(false);
      }
    };
    if (showPresetMenu || showSaveMenu || showBrickMenu || showShapesMenu) {
      window.addEventListener("pointerdown", handleGlobalClick);
      return () => window.removeEventListener("pointerdown", handleGlobalClick);
    }
  }, [showPresetMenu, showSaveMenu, showBrickMenu, showShapesMenu]);

  // Load save on startup
  useEffect(() => {
    const saved = localStorage.getItem("brickxr-save");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Not an array");

        if (Array.isArray(parsed) && parsed.every(isValidBrickData)) {
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
    useLegoStore.getState().triggerScreenshot();
  };

  const handleSave = async () => {
    const bricks = useLegoStore.getState().bricks;
    const data = JSON.stringify(bricks, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    try {
      let canUsePicker = false;
      if ("showSaveFilePicker" in window) {
        try { canUsePicker = window.self === window.top; }
        catch (e) { canUsePicker = false; }
      }
      if (canUsePicker) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: "brick-build.json",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await (handle as any).createWritable();
        await writable.write(blob);
        await writable.close();
        useLegoStore.getState().setToastMessage("Saved successfully.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "brick-build.json";
        a.click();
        URL.revokeObjectURL(url);
        useLegoStore.getState().setToastMessage("Saved to file.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        useLegoStore
          .getState()
          .setToastMessage("Failed to save: " + err.message);
      }
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const state = useLegoStore.getState();

      switch (e.key.toLowerCase()) {
        case "s":
          if (sKeyTracker.current.timeout) {
            clearTimeout(sKeyTracker.current.timeout);
            sKeyTracker.current.timeout = null;
          }
          sKeyTracker.current.count += 1;
          if (sKeyTracker.current.count >= 3) {
            state.setMode("Move");
            state.setSelectionMode("Group");
            sKeyTracker.current.count = 0;
          } else {
            sKeyTracker.current.timeout = setTimeout(() => {
              useLegoStore.getState().setMode("Move");
              if (sKeyTracker.current.count === 1) {
                useLegoStore.getState().setSelectionMode("Solo");
              } else if (sKeyTracker.current.count === 2) {
                useLegoStore.getState().setSelectionMode("Multi");
              }
              sKeyTracker.current.count = 0;
            }, 350);
          }
          break;
        case "p":
          setShowPresetMenu((prev) => {
            if (!prev) {
              setShowBrickMenu(false);
              setShowSaveMenu(false);
            }
            return !prev;
          });
          break;
        case "b":
          state.setMode("Build");
          setShowBrickMenu((prev) => {
            if (!prev) {
              setShowPresetMenu(false);
              setShowSaveMenu(false);
              setShowShapesMenu(false);
            }
            return !prev;
          });
          break;
        case "r":
          state.triggerRotateGhost();
          break;
        case "c":
          if (state.isCameraLocked) {
            state.setIsCameraLocked(false);
            state.setMode("Move");
            state.setIsDraggingBrick(false);
          } else {
            state.setIsCameraLocked(true);
          }
          break;
        case "e":
          if (state.mode === "Delete") {
            state.setMode("Build");
          } else {
            state.setMode("Delete");
            state.setIsDraggingBrick(false);
          }
          break;
        case "h":
          setUiVisible((prev) => !prev);
          break;
        case "escape":
          let menuClosed = false;
          if (showPresetMenu) { setShowPresetMenu(false); menuClosed = true; }
          if (showBrickMenu) { setShowBrickMenu(false); menuClosed = true; }
          if (showShapesMenu) { setShowShapesMenu(false); menuClosed = true; }
          if (showSaveMenu) { setShowSaveMenu(false); menuClosed = true; }
          if (showHelp) { setShowHelp(false); menuClosed = true; }
          if (showBuildIdeas) { setShowBuildIdeas(false); menuClosed = true; }
          if (showClearConfirm) { setShowClearConfirm(false); menuClosed = true; }
          if (menuClosed) {
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
          break;
        case "delete":
        case "backspace":
          if (state.selectionMode === "Multi" && state.multiSelectedBrickIds.length > 0) {
            const toRender = state.bricks.filter(
              (b) => !state.multiSelectedBrickIds.includes(b.id),
            );
            state.setBricks(toRender);
            state.setMultiSelectedBrickIds([]);
            state.setMode("Build");
          } else if (state.mode === "Move" && state.movingBrickId) {
            const toRender = state.bricks.filter(
              (b) => b.id !== state.movingBrickId,
            );
            state.setBricks(toRender);
            state.setMode("Build");
            state.setIsDraggingBrick(false);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
  }, [showPresetMenu, showBrickMenu, showSaveMenu, showHelp, showClearConfirm]);

  const handleLoad = async () => {
    try {
      let canUsePicker = false;
      if ("showOpenFilePicker" in window) {
        try { canUsePicker = window.self === window.top; }
        catch (e) { canUsePicker = false; }
      }
      if (canUsePicker) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(isValidBrickData)) {
          useLegoStore.getState().setBricks(parsed);
          useLegoStore.getState().setToastMessage("Loaded successfully.");
        } else {
          throw new Error("Invalid format");
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.every(isValidBrickData)) {
              useLegoStore.getState().setBricks(parsed);
              useLegoStore.getState().setToastMessage("Loaded successfully.");
            } else {
              throw new Error("Invalid format");
            }
          } catch (err: any) {
            useLegoStore
              .getState()
              .setToastMessage("Failed to load: " + err.message);
          }
        };
        input.click();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        useLegoStore
          .getState()
          .setToastMessage("Failed to load: " + err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-bg text-white overflow-hidden font-sans viewport-gradient">
      <AnimatePresence>
        {xrError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <div className="max-w-md w-full bg-red-950/20 border border-red-500/50 p-8 rounded-3xl text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <InfoIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                XR Session Error
              </h2>
              <p className="text-red-200/70 mb-8 leading-relaxed">{xrError}</p>
              <button
                onClick={() => setXrError(null)}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-colors shadow-lg"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
        {isFadingToVR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-md"
          >
            <div className="bg-[#111] border border-purple-500/50 px-8 py-6 rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.4)] flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              <span className="text-white font-bold tracking-widest text-lg uppercase">
                Entering VR...
              </span>
              <span className="text-white/60 text-sm text-center">
                Put on your headset
              </span>
            </div>
          </motion.div>
        )}
        {showVRPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto"
          >
            <div className="bg-[#111] border border-purple-500/30 p-6 rounded-2xl max-w-sm text-center shadow-[0_0_40px_rgba(168,85,247,0.2)]">
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                Enter VR Mode
              </h2>
              <p className="text-sm text-gray-300 mb-4 text-left leading-relaxed">
                Immersive VR will open in your Quest Browser.
                <br />
                <br />
                <span className="text-purple-400 font-semibold">
                  Controllers
                </span>{" "}
                are used for building and selection.
                <br />
                <br />
                Please stay seated or ensure your physical play space is clear.
              </p>
              <div className="flex gap-3 justify-end items-center mt-6">
                <button
                  onClick={() => setShowVRPrompt(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    import("./services/AudioService").then((m) => m.audioService.resume());
                    if ((import.meta as any).env.DEV)
                      console.log("[VR] enterVR requested");
                    setShowVRPrompt(false);
                    setIsFadingToVR(true);
                    try {
                      const p = xrStore.enterVR();
                      if (p && typeof p.catch === "function") {
                        p.then(() => {
                          if ((import.meta as any).env.DEV)
                            console.log("[VR] enterVR success");
                        }).catch((err: any) => {
                          if ((import.meta as any).env.DEV)
                            console.error("[VR] enterVR failed:", err);
                          let msg =
                            "VR failed to start. Browser may not support WebXR.";
                          if (err?.name === "NotAllowedError")
                            msg =
                              "WebXR session request was denied. Check site permissions.";
                          if (err?.name === "SecurityError")
                            msg = "VR session restricted by security policy.";
                          setXrError(msg);
                          setIsFadingToVR(false);
                        });
                      }
                    } catch (e: any) {
                      if ((import.meta as any).env.DEV)
                        console.error("[VR] enterVR exception:", e);
                      setXrError(
                        `Unexpected XR error: ${e.message || "Unknown error"}`,
                      );
                      setIsFadingToVR(false);
                    }
                    setTimeout(() => setIsFadingToVR(false), 2000);
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/50"
                >
                  Enter VR
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Viewport */}
      <div
        className="absolute inset-0 z-0"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Canvas
          shadows
          camera={{ position: [2.8, 2.2, 3.2], fov: 50 }}
          style={{ touchAction: "none" }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense
            fallback={
              <Html center>
                <div className="bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm font-mono text-sm border border-purple-500/30 whitespace-nowrap">
                  Loading Experience...
                </div>
              </Html>
            }
          >
            <Scene xrStore={xrStore} />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      {!isXRActive && (
        <>
          <div className="absolute inset-0 z-10 pointer-events-none safe-screen flex flex-col justify-between">
            {/* Top Area */}
            <AnimatePresence>
              {uiVisible && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-3 w-full pointer-events-none shrink-0 pt-2 sm:pt-4"
                >
              {/* Top Bar */}
              <div className="flex justify-between items-center pointer-events-auto gap-2 scale-ui-top shrink-0">
                <div className="flex flex-col shrink-0">
                  <div className="text-base sm:text-xl font-extrabold tracking-[2px] flex items-center gap-1 sm:gap-2 shrink-0">
                    BRICK{" "}
                    <span className="font-light opacity-60 hidden sm:inline">
                      XR
                    </span>
                  </div>
                  <motion.div
                    className="font-handwriting text-red-500 text-sm sm:text-base -mt-1"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1, delayChildren: 0.5 },
                      },
                    }}
                  >
                    {"LegoCraft".split("").map((char, index) => (
                      <motion.span
                        key={index}
                        variants={{
                          hidden: { opacity: 0, y: 5, rotate: -10 },
                          visible: { opacity: 1, y: 0, rotate: 0 },
                        }}
                        style={{ display: "inline-block" }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
                <div className="flex flex-nowrap gap-1.5 sm:gap-4 shrink-0 items-center justify-end">
                  <button
                    onClick={() => setShowBuildIdeas(true)}
                    title="Build Ideas"
                    className="bg-black/40 border border-white/20 text-accent p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <LucideLightbulb size={16} />
                  </button>
                  <button
                    onClick={() => setShowHelp(true)}
                    title="Show Help"
                    className="bg-black/40 border border-white/20 text-white/80 p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <HelpIcon size={16} />
                  </button>
                  <div className="flex gap-1.5 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoad();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="bg-black/40 border border-white/20 text-white/80 p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Import Project (.json)"
                    >
                      <LoadIcon size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSaveMenu(!showSaveMenu);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="bg-black/40 border border-white/20 text-white/80 p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Save / Export Menu"
                    >
                      <SaveIcon size={16} />
                    </button>
                  </div>
                  <div
                    className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-[8px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center border truncate bg-black/40 border-white/20 text-white/80`}
                  >
                    {bricks.length} {bricks.length === 1 ? "Brick" : "Bricks"}
                    {bricks.length > 200 && (
                      <span className="text-yellow-400 ml-1">
                        {" "}
                        (High count)
                      </span>
                    )}
                  </div>
                  {vrStatus === "ready" ? (
                    <button
                      onClick={() => setShowVRPrompt(true)}
                      className="bg-purple-600/80 backdrop-blur-md border border-purple-400/50 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-[8px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:bg-purple-500 transition-colors leading-tight"
                      title="Enter VR Session"
                    >
                      Enter VR
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-gray-600/50 backdrop-blur-md border border-gray-500/30 text-gray-400/50 px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-[8px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center cursor-not-allowed leading-tight"
                      title={
                        vrStatus === "https-required" ? "VR requires HTTPS or localhost." :
                        vrStatus === "no-xr" ? "WebXR is not available in this browser. Open on Meta Quest Browser to use VR." :
                        vrStatus === "unsupported" ? "Immersive VR is not supported on this device/browser." :
                        "Checking VR support..."
                      }
                    >
                      Enter VR
                    </button>
                  )}
                  <div
                    title={
                      vrStatus === "https-required" ? "VR requires HTTPS or localhost." :
                      vrStatus === "no-xr" ? "WebXR is not available in this browser." :
                      vrStatus === "unsupported" ? "Immersive VR is not supported on this device/browser." :
                      "VR Status"
                    }
                    className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-[8px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center border truncate max-w-[100px] sm:max-w-[200px] whitespace-nowrap leading-tight ${
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
                        ? "Checking..."
                        : vrStatus === "https-required"
                          ? "HTTPS Required"
                          : "VR Unavailable"}
                  </div>
                </div>
              </div>

              {/* Camera Modes */}
              <div className="flex justify-center pointer-events-auto w-full">
                <div className="flex items-center gap-1 pointer-events-auto bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => {
                      setCameraMode("Pan");
                      setIsCameraLocked(false);
                      setMode("Move");
                    }}
                    className={`p-1.5 rounded-md transition-colors ${!isCameraLocked && cameraMode === "Pan" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
                    title="Pan Camera"
                  >
                    <PanIcon size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setCameraMode("Zoom");
                      setIsCameraLocked(false);
                      setMode("Move");
                    }}
                    className={`p-1.5 rounded-md transition-colors ${!isCameraLocked && cameraMode === "Zoom" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
                    title="Zoom Camera"
                  >
                    <ZoomIcon size={16} />
                  </button>
                  {cameraMode === "Zoom" && (
                    <>
                      <button
                        onClick={() =>
                          useLegoStore.getState().triggerCameraZoom("in")
                        }
                        className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-70"
                        title="Zoom In"
                      >
                        <ZoomInIcon size={16} />
                      </button>
                      <button
                        onClick={() =>
                          useLegoStore.getState().triggerCameraZoom("out")
                        }
                        className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-70"
                        title="Zoom Out"
                      >
                        <ZoomOutIcon size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setCameraMode("Orbit");
                      setIsCameraLocked(false);
                      setMode("Move");
                    }}
                    className={`p-1.5 rounded-md transition-colors ${!isCameraLocked && cameraMode === "Orbit" ? "bg-white/20" : "hover:bg-white/10 opacity-70"}`}
                    title="Orbit Camera"
                  >
                    <OrbitCameraIcon size={16} />
                  </button>
                  <div className="w-[1px] h-[20px] bg-white/20 mx-0.5"></div>
                  <button
                    onClick={() =>
                      useLegoStore.getState().triggerCameraRecenter()
                    }
                    className="p-1.5 rounded-md hover:bg-white/10 transition-colors opacity-70"
                    title="Reset Camera View"
                  >
                    <HomeIcon size={16} />
                  </button>
                  <div className="w-[1px] h-[20px] bg-white/20 mx-0.5"></div>
                  <button
                    onClick={() => {
                      if (isCameraLocked) {
                        setIsCameraLocked(false);
                        setCameraMode("Orbit");
                      } else {
                        setIsCameraLocked(true);
                      }
                      setMode("Move");
                    }}
                    className={`p-1.5 rounded-md transition-colors ${isCameraLocked || mode === "Build" ? "bg-red-500/80 text-white" : "hover:bg-white/10 opacity-70"}`}
                    title={
                      mode === "Move"
                        ? "Lock Camera (\u2714 Required for drag-select)"
                        : "Lock Camera"
                    }
                  >
                    <LockIcon size={16} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {toastMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className={`${
                      toastMessage.toLowerCase().includes("fail") ||
                      toastMessage.toLowerCase().includes("clear") ||
                      toastMessage.toLowerCase().includes("could not")
                        ? "bg-red-600/90 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                        : "bg-blue-600/90 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    } border text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm pointer-events-auto backdrop-blur-md flex items-center gap-2 self-center mt-2 shrink-0 z-50`}
                  >
                    <InfoIcon size={16} />
                    {toastMessage}
                  </motion.div>
                )}
              </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Absolute Floating Docks (Anchored to middle) */}
            {/* Left Tools */}
            <div className="absolute safe-area-left top-[55%] -translate-y-1/2 flex items-center gap-2 pointer-events-none z-20">
              <div className="glass-panel w-auto p-1.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center gap-1 sm:gap-3 pointer-events-auto shrink-0 scale-ui-left">
                <ToolIconButton
                  icon={uiVisible ? <EyeIcon size={24} /> : <EyeOffIcon size={24} />}
                  active={false}
                  onClick={() => {
                    setUiVisible(!uiVisible);
                    if (uiVisible) {
                      setShowPresetMenu(false);
                      setShowSaveMenu(false);
                      setShowBrickMenu(false);
                      setShowHelp(false);
                    }
                  }}
                  title={uiVisible ? "Hide UI" : "Show UI"}
                />
                {uiVisible && (
                  <>
                    <div className="w-[80%] h-px bg-white/10 my-1" />
                    <ToolIconButton
                      icon={<BuildIcon size={24} />}
                      active={mode === "Build"}
                      onClick={() => {
                        setMode("Build");
                        setShowBrickMenu(false);
                        setShowShapesMenu(false);
                        setShowPresetMenu(false);
                      }}
                      title="Build Mode"
                    />
                    <ToolIconButton
                      icon={<MoveIcon size={24} />}
                      active={mode === "Move"}
                      onClick={() => {
                        setMode("Move");
                        setShowBrickMenu(false);
                        setShowShapesMenu(false);
                        setShowPresetMenu(false);
                      }}
                      title="Move Mode"
                    />
                    <ToolIconButton
                      icon={<RotateIcon size={24} />}
                      active={false}
                      disabled={
                        mode === "Delete" ||
                        (mode === "Move" &&
                          !useLegoStore.getState().movingBrickId &&
                          useLegoStore.getState().multiSelectedBrickIds.length ===
                            0)
                      }
                      onClick={() => useLegoStore.getState().triggerRotateGhost()}
                      title="Rotate Brick"
                    />
                    <ToolIconButton
                      icon={<DeleteIcon size={24} />}
                      active={mode === "Delete"}
                      onClick={() => {
                        const state = useLegoStore.getState();
                        if (
                          (state.mode === "Move" || state.mode === "Delete") &&
                          (state.movingBrickId ||
                            state.multiSelectedBrickIds.length > 0)
                        ) {
                          // Delete currently selected brick(s)
                          if (state.selectionMode === "Group") {
                            const movingBrick = state.bricks.find(
                              (b) => b.id === state.movingBrickId,
                            );
                            if (movingBrick) {
                              const allb = state.bricks;
                              const g = getGroupBricks(movingBrick, allb);
                              state.removeBricks(g.map((bz: any) => bz.id));
                            }
                          } else if (state.selectionMode === "Multi") {
                            state.removeBricks(state.multiSelectedBrickIds);
                            state.setMultiSelectedBrickIds([]);
                          } else {
                            if (state.movingBrickId)
                              state.removeBrick(state.movingBrickId);
                          }
                          state.setMovingBrickId(null);
                          state.setIsDraggingBrick(false);
                        } else {
                          setMode("Delete");
                          setShowBrickMenu(false);
                          setShowShapesMenu(false);
                          setShowPresetMenu(false);
                        }
                      }}
                      title="Delete Mode"
                    />
                  </>
                )}
              </div>

              <AnimatePresence>
                {uiVisible && (mode === "Move" || mode === "Delete") && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="glass-panel flex flex-col gap-1.5 p-1.5 sm:p-2 rounded-[14px] sm:rounded-2xl pointer-events-auto shrink-0"
                  >
                    <button
                      onClick={() => setSelectionMode("Solo")}
                      className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all font-bold text-[9px] sm:text-[11px] uppercase tracking-wider ${
                        selectionMode === "Solo"
                          ? "bg-white/20 text-white shadow-md ring-1 ring-white/30"
                          : "text-white/40 hover:text-white/80 hover:bg-white/5"
                      }`}
                      title="Select Single Brick"
                    >
                      Solo
                    </button>
                    <button
                      onClick={() => setSelectionMode("Multi")}
                      className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all font-bold text-[9px] sm:text-[11px] uppercase tracking-wider ${
                        selectionMode === "Multi"
                          ? "bg-white/20 text-white shadow-md ring-1 ring-white/30"
                          : "text-white/40 hover:text-white/80 hover:bg-white/5"
                      }`}
                      title="Select Multiple Bricks"
                    >
                      Multi
                    </button>
                    <button
                      onClick={() => setSelectionMode("Group")}
                      className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all font-bold text-[9px] sm:text-[11px] uppercase tracking-wider ${
                        selectionMode === "Group"
                          ? "bg-white/20 text-white shadow-md ring-1 ring-white/30"
                          : "text-white/40 hover:text-white/80 hover:bg-white/5"
                      }`}
                      title="Select Entire Group"
                    >
                      Group
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Colors */}
            <AnimatePresence>
              {uiVisible && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute safe-area-right top-[55%] -translate-y-1/2 pointer-events-none z-20"
                >
                  <div className="glass-panel p-1.5 sm:p-3 rounded-xl sm:rounded-2xl pointer-events-auto shadow-xl scale-ui-right">
                    <div className="grid grid-cols-2 gap-1 sm:gap-2">
                      {LEGO_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className="w-[34px] h-[34px] sm:w-[46px] sm:h-[46px] flex items-center justify-center shrink-0"
                          title={`Select color: ${color}`}
                          aria-label={`Select color: ${color}`}
                        >
                          <div
                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all shadow-sm ${
                              selectedColor === color
                                ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-1 ring-white/50"
                                : "border-white/10 opacity-80 hover:opacity-100 hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spacer to push Bottom Toolbar Area down since Center UI is absolute */}
            <div className="flex-1" />

            {/* Bottom Toolbar Area */}
            <AnimatePresence>
              {uiVisible && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex flex-col items-center gap-2 sm:gap-6 w-full pointer-events-none shrink-0"
                >
              {/* Brick Type Selector (Build Mode Only) */}
              <AnimatePresence>
                {mode === "Build" && !activePreset && showBrickMenu && (
                  <motion.div
                    ref={brickMenuRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed bottom-[85px] sm:bottom-[100px] left-1/2 bg-black/80 border border-white/20 backdrop-blur-2xl p-3 sm:p-4 rounded-[20px] sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] flex flex-col gap-3 pointer-events-auto overflow-y-auto max-h-[50vh] w-max max-w-[calc(100vw-32px)] scroll-panel"
                  >
                    <div className="bg-blue-500/20 px-4 py-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-1 rounded-t-[19px] sm:rounded-t-[23px] border-b border-blue-500/30">
                      <div className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center">
                        Standard Bricks
                      </div>
                    </div>
                    <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                      {BRICK_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedType(type);
                            setMode("Build");
                            setShowBrickMenu(false);
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

                {mode === "Build" && !activePreset && showShapesMenu && (
                  <motion.div
                    ref={shapesMenuRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
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
                              setShowShapesMenu(false);
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
                            {!shape.supported && (
                              <div className="text-[9px] text-white/30 leading-tight mt-1 px-1 line-clamp-2">
                                Coming Soon
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {mode === "Build" && activePreset && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="glass-panel p-2 rounded-2xl pointer-events-auto flex items-center gap-2 sm:gap-4 shadow-2xl px-4 py-2 sm:px-6 sm:py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-emerald-400">
                        Placing Preset
                      </span>
                      <span className="text-[10px] sm:text-xs text-white/60">
                        Click to stamp, drag to position
                      </span>
                    </div>
                    <div className="w-px h-6 sm:h-8 bg-white/10" />
                    <button
                      onClick={() => loadPreset(null)}
                      className="bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-[13px] font-semibold transition-all border border-red-500/30"
                    >
                      Cancel Preset
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Core Actions */}
              <div className="glass-panel w-full max-w-3xl p-2 sm:p-4 rounded-[16px] sm:rounded-[20px] flex justify-center items-center pointer-events-auto shadow-2xl gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={undo}
                    disabled={undoStack.length === 0}
                    title="Undo"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${undoStack.length === 0 ? "opacity-50 cursor-not-allowed bg-white/5 border-glass-border text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <UndoIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Undo
                    </span>
                  </button>
                  <button
                    onClick={redo}
                    disabled={redoStack.length === 0}
                    title="Redo"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${redoStack.length === 0 ? "opacity-50 cursor-not-allowed bg-white/5 border-glass-border text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <RedoIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Redo
                    </span>
                  </button>
                </div>

                <div className="w-px h-6 bg-glass-border shrink-0" />

                <div className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showBrickMenu) {
                        setShowBrickMenu(false);
                      } else {
                        setShowBrickMenu(true);
                        setShowShapesMenu(false);
                        setShowPresetMenu(false);
                        setShowSaveMenu(false);
                        if (mode !== "Build") setMode("Build");
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Bricks"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${showBrickMenu ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <BuildIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Bricks
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showShapesMenu) {
                        setShowShapesMenu(false);
                      } else {
                        setShowShapesMenu(true);
                        setShowBrickMenu(false);
                        setShowPresetMenu(false);
                        setShowSaveMenu(false);
                        if (mode !== "Build") setMode("Build");
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Shapes"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${showShapesMenu ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <ShapesIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Shapes
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showPresetMenu) {
                        setShowPresetMenu(false);
                      } else {
                        setShowPresetMenu(true);
                        setShowBrickMenu(false);
                        setShowShapesMenu(false);
                        setShowSaveMenu(false);
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Toggle Presets Menu"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${showPresetMenu ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <PresetsIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Presets
                    </span>
                  </button>
                </div>

                <div className="w-px h-6 bg-glass-border shrink-0" />

                <div className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
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
                    disabled={bricks.length === 0}
                    title="Clear all bricks"
                    className={`w-11 h-11 sm:w-auto sm:px-4 sm:h-11 flex items-center justify-center gap-2 shrink-0 border rounded-xl transition-colors ${bricks.length === 0 ? "opacity-50 cursor-not-allowed bg-white/5 border-glass-border text-white" : "bg-white/5 border-glass-border hover:bg-white/10 text-white"}`}
                  >
                    <ClearIcon size={18} />
                    <span className="hidden sm:inline text-[13px] font-semibold">
                      Clear
                    </span>
                  </button>
                </div>
              </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preset Menu Overlay */}
          <Suspense fallback={null}>
            <PresetMenuOverlay
              show={showPresetMenu}
              onClose={() => setShowPresetMenu(false)}
              presetMenuRef={presetMenuRef}
              presets={PRESET_OPTIONS}
            />

            <SaveExportMenuOverlay
              show={showSaveMenu}
              onClose={() => setShowSaveMenu(false)}
              saveMenuRef={saveMenuRef}
              onSaveProject={handleSave}
              onExportGLB={() => {
                useLegoStore.getState().exportGLB?.();
              }}
              onScreenshot={handleScreenshot}
            />

            <BuildIdeas
              show={showBuildIdeas}
              onClose={() => setShowBuildIdeas(false)}
            />
            <HelpModal
              show={showHelp}
              onClose={() => {
                setShowHelp(false);
                localStorage.setItem("brickxr-help-dismissed", "true");
              }}
            />

            <ClearConfirmModal
              show={showClearConfirm}
              onClose={() => setShowClearConfirm(false)}
              onConfirm={() => {
                clearAll();
                setShowClearConfirm(false);
                useLegoStore.getState().setToastMessage("Build cleared.");
              }}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}

function ToolIconButton({ icon, active, disabled, onClick, title }: any) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className={`w-11 h-11 sm:w-[60px] sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all border ${
        disabled
          ? "opacity-30 cursor-not-allowed border-transparent text-white/40"
          : active
          ? "bg-accent border-white/40 shadow-lg text-white hover:bg-accent/80 cursor-pointer"
          : "border-transparent text-white/60 hover:bg-white/5 hover:text-white cursor-pointer"
      }`}
    >
      <div className="scale-75 sm:scale-100 flex items-center justify-center">
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <span className="text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 font-semibold leading-none text-center">
        {title.replace(" Mode", "").replace(" Brick", "")}
      </span>
    </button>
  );
}
