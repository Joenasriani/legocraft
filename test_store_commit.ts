import { useLegoStore } from "./src/Store";
const store = useLegoStore.getState();
store.loadPreset("horse");
store.commitPreset([0, 0, 0], 0);
console.log("Bricks after commit:", useLegoStore.getState().bricks.length);
console.log("Groups:", new Set(useLegoStore.getState().bricks.map(b => b.groupId)));
