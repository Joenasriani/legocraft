import fs from 'fs';
let content = fs.readFileSync('src/components/Scene.tsx', 'utf8');

const target = `              {((mode === "Build" && !activePreset) ||
                (mode === "Move" && movingBrick)) && (
                <LegoBrick
                  id="ghost"
                  type={movingBrick ? movingBrick.type : selectedType}
                  color={movingBrick ? movingBrick.color : selectedColor}
                  position={ghostPosition}
                  rotation={ghostRotation}
                  isPlacementGhost
                />
              )}`;

const replacement = `              {mode === "Build" && !activePreset && (
                <LegoBrick
                  id="ghost"
                  type={selectedType}
                  color={selectedColor}
                  position={ghostPosition}
                  rotation={ghostRotation}
                  isPlacementGhost
                />
              )}

              {mode === "Move" && movingBrick && (
                <>
                  {Object.entries(groupedGhostGroupBricks).map(([key, group]) => {
                    const [type, color] = key.split("_");
                    return (
                      <BrickInstances
                        key={\`moving-ghost-\${key}\`}
                        type={type as any}
                        color={color}
                        bricks={group}
                        isGhost
                      />
                    );
                  })}
                </>
              )}`;

content = content.replaceAll(target, replacement);
fs.writeFileSync('src/components/Scene.tsx', content);
console.log('Patched Scene.tsx');
