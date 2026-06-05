import { PRESETS, getPresetInfo } from "./src/Store.ts";
import { transformBricks, calculateRotMod } from "./src/lib/transformUtils.ts";

const preset = PRESETS['horse'];
const info = getPresetInfo('horse');
const rotMod = calculateRotMod(0);

const transformed = transformBricks(
  preset,
  [info.cx, info.minY, info.cz],
  [0, 0, 0],
  rotMod
);

console.log("Transformed:", transformed.map(b => b.position));
