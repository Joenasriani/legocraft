import fs from 'fs';
let content = fs.readFileSync('src/components/Scene.tsx', 'utf8');
content = content.replace(/onContextMenu=\{\([^)]*\)\s*=>\s*\{\s*e\.stopPropagation\(\);\s*\}\}/g, "onContextMenu={handleContextMenu}");
fs.writeFileSync('src/components/Scene.tsx', content);
console.log('Replaced onContextMenu');
