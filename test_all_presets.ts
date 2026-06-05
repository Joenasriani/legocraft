import { PRESETS } from "./src/Store.ts";

for (const key of Object.keys(PRESETS)) {
  const bricks = PRESETS[key as keyof typeof PRESETS];
  console.log(`${key}: ${bricks?.length} bricks`);
}
