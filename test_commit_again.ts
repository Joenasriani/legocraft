import { useLegoStore, checkStructureValid } from "./src/Store.ts";

const state = useLegoStore.getState();
state.loadPreset("horse");
state.commitPreset([0, 0, 0], 0);

console.log("Bricks added:", state.bricks.length);
