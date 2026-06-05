import { getPresetInfo, checkStructureValid, PRESETS, isValidBrickData, PresetName } from "./src/Store";
import { transformBricks, calculateRotMod } from "./src/lib/transformUtils";
import { MODULE_SIZE, BRICK_HEIGHT } from "./src/constants";

const presetNames = Object.keys(PRESETS) as PresetName[];

for (const name of presetNames) {
  const bricksData = PRESETS[name];
  const info = getPresetInfo(name, []);
  
  for (const rotation of [0, 90, 180, 270]) {
    const rotMod = calculateRotMod(rotation);
    const transformed = transformBricks(
      bricksData.filter(isValidBrickData),
      [info.cx, info.minY, info.cz],
      [0, 0, 0],
      rotMod
    );
    
    const res = checkStructureValid([], transformed, MODULE_SIZE, BRICK_HEIGHT);
    if (!res.valid) {
      console.log(`❌ Preset "${name}" at rotation ${rotation} is INVALID! Reason: ${res.reason}`);
    } else {
      console.log(`✅ Preset "${name}" at rotation ${rotation} is VALID.`);
    }
  }
}
