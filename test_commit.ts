import { useLegoStore } from "./src/Store.ts";

const state = useLegoStore.getState();
state.loadPreset("horse");
const state2 = useLegoStore.getState();
console.log(state2.activePreset ? state2.activePreset.bricks.length : 0);
state2.commitPreset([0, 0, 0], 0);

console.log("Bricks added:", useLegoStore.getState().bricks.length);
