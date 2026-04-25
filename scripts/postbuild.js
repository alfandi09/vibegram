// scripts/postbuild.js
// Adds package.json markers to dist/cjs and dist/esm so Node.js resolves
// them with the correct module system. ESM relative imports are also
// normalized to include .js extensions for Node's ESM resolver.

const fs = require('fs');
const path = require('path');

function hasExplicitExtension(specifier) {
    const cleanSpecifier = specifier.split('?')[0].split('#')[0];
    return path.posix.extname(cleanSpecifier) !== '';
}

function withJsExtension(specifier) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
    if (specifier.endsWith('/') || hasExplicitExtension(specifier)) return specifier;
    return `${specifier}.js`;
}

function addJsExtensionsToEsmImports(source) {
    return source
        .replace(/(\bfrom\s*['"])(\.{1,2}\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
            return `${prefix}${withJsExtension(specifier)}${suffix}`;
        })
        .replace(
            /(\bimport\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,
            (_match, prefix, specifier, suffix) => {
                return `${prefix}${withJsExtension(specifier)}${suffix}`;
            }
        )
        .replace(
            /(\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g,
            (_match, prefix, specifier, suffix) => {
                return `${prefix}${withJsExtension(specifier)}${suffix}`;
            }
        );
}

function rewriteEsmImports(esmDir) {
    const files = fs.readdirSync(esmDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(esmDir, file);
        const source = fs.readFileSync(filePath, 'utf8');
        const rewritten = addJsExtensionsToEsmImports(source);
        if (rewritten !== source) {
            fs.writeFileSync(filePath, rewritten);
        }
    }
}

const cjsDir = path.join(__dirname, '..', 'dist', 'cjs');
if (fs.existsSync(cjsDir)) {
    fs.writeFileSync(
        path.join(cjsDir, 'package.json'),
        JSON.stringify({ type: 'commonjs' }, null, 2)
    );
    console.log('dist/cjs/package.json written');
}

const esmDir = path.join(__dirname, '..', 'dist', 'esm');
if (fs.existsSync(esmDir)) {
    rewriteEsmImports(esmDir);
    fs.writeFileSync(
        path.join(esmDir, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2)
    );
    console.log('dist/esm imports normalized');
    console.log('dist/esm/package.json written');
}
