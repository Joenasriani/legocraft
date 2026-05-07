import fs from 'fs';
const storeContent = fs.readFileSync('src/Store.ts', 'utf8');

const target = `export const PRESETS: Record<PresetName, BrickData[]> = {
  horse: generateHorse(),
  sheep: generateSheep(),
  car: generateCar(),
  road: generateRoad(),
  mountain: generateMountain(),
  tree: generateLifeSizedTree(),
  cabin: generateLifeSizedCabin(),
  round_water_well: generateRoundWaterWell(),
  pine_tree: generatePineTree(),
  walk_in_castle: generateWalkInCastle(),
};`;

const replacement = `const repairPreset = (bricks: BrickData[]): BrickData[] => {
  let allBricks = [...bricks];
  let hasFloating = true;
  let iterations = 0;
  while (hasFloating && iterations < 1000) {
    hasFloating = false;
    iterations++;
    allBricks.sort((a, b) => a.position[1] - b.position[1]);
    
    for (let i = 0; i < allBricks.length; i++) {
      const b = allBricks[i];
      if (b.position[1] <= 0.01) continue; // grounded
      
      let isSupported = false;
      const bCells = getOccupiedCells(b, ms);
      
      for (let j = 0; j < allBricks.length; j++) {
        if (i === j) continue;
        const other = allBricks[j];
        if (Math.abs((b.position[1] - bh) - other.position[1]) < 0.01) {
          const oCells = getOccupiedCells(other, ms);
          const overlap = bCells.some(bc => 
            oCells.some(oc => Math.abs(bc.x - oc.x) < 0.01 && Math.abs(bc.z - oc.z) < 0.01)
          );
          if (overlap) {
            isSupported = true;
            break;
          }
        }
      }
      
      if (!isSupported) {
        hasFloating = true;
        // pick center cell
        const cell = bCells[Math.floor(bCells.length / 2)];
        const gridX = Math.round(cell.x / ms);
        const gridZ = Math.round(cell.z / ms);
        const gridY = Math.round((b.position[1] - bh) / bh);
        
        allBricks.push(createBrick("1x1", b.color, gridX, gridY, gridZ, 0));
        break; // break the for loop and restart while loop
      }
    }
  }
  return allBricks;
};

export const PRESETS: Record<PresetName, BrickData[]> = {
  horse: repairPreset(generateHorse()),
  sheep: repairPreset(generateSheep()),
  car: repairPreset(generateCar()),
  road: repairPreset(generateRoad()),
  mountain: repairPreset(generateMountain()),
  tree: repairPreset(generateLifeSizedTree()),
  cabin: repairPreset(generateLifeSizedCabin()),
  round_water_well: repairPreset(generateRoundWaterWell()),
  pine_tree: repairPreset(generatePineTree()),
  walk_in_castle: repairPreset(generateWalkInCastle()),
};`;

if (!storeContent.includes(target)) {
  console.log("Target not found!");
} else {
  fs.writeFileSync('src/Store.ts', storeContent.replace(target, replacement));
  console.log("Patched PRESETS!");
}
