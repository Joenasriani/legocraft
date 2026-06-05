import { PRESETS } from "./src/Store.ts";

const keys = ["tree", "walk_in_castle", "round_water_well", "car", "horse", "cabin", "pine_tree"];
for (const k of keys) {
  const bricks = PRESETS[k as keyof typeof PRESETS];
  console.log(`Manual Check ${k}: ${bricks?.length || 0} bricks`);
}
