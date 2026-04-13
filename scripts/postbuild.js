// scripts/postbuild.js
// Adds package.json markers to dist/cjs and dist/esm
// so Node.js resolves them with the correct module system.

const fs = require('fs');
const path = require('path');

// dist/cjs/package.json → "type": "commonjs"
const cjsDir = path.join(__dirname, '..', 'dist', 'cjs');
if (fs.existsSync(cjsDir)) {
    fs.writeFileSync(
        path.join(cjsDir, 'package.json'),
        JSON.stringify({ type: 'commonjs' }, null, 2)
    );
    console.log('✅ dist/cjs/package.json written');
}

// dist/esm/package.json → "type": "module"
const esmDir = path.join(__dirname, '..', 'dist', 'esm');
if (fs.existsSync(esmDir)) {
    fs.writeFileSync(
        path.join(esmDir, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2)
    );
    console.log('✅ dist/esm/package.json written');
}
