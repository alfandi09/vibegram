const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function writePackageMarker(dir, type) {
    const targetDir = path.join(root, 'dist', dir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
        path.join(targetDir, 'package.json'),
        `${JSON.stringify({ type }, null, 2)}\n`,
        'utf8'
    );
}

writePackageMarker('cjs', 'commonjs');
writePackageMarker('esm', 'module');

console.log('dist package markers written');
