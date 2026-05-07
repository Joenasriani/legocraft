import fs from 'fs';
const content = fs.readFileSync('src/components/Scene.tsx', 'utf8');
const newContent = content.replaceAll(
  'onContextMenu={(e) => {\n                e.stopPropagation();\n              }}',
  'onContextMenu={handleContextMenu}'
);
fs.writeFileSync('src/components/Scene.tsx', newContent);
console.log('Replaced onContextMenu');
