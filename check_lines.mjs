import fs from 'fs';
const lines = fs.readFileSync('dist/esbuild.js', 'utf-8').split('\n');
console.log(lines.slice(136890, 136900).join('\n'));
