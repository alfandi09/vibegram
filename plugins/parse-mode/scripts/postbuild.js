const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const cjsDir = join(root, 'dist', 'cjs');
const esmDir = join(root, 'dist', 'esm');

mkdirSync(cjsDir, { recursive: true });
mkdirSync(esmDir, { recursive: true });
writeFileSync(join(cjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }) + '\n');
writeFileSync(join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
console.log('dist package markers written');
