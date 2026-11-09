#!/usr/bin/env node
// scripts/generate-bot-api.js
// Downloads the official Telegram Bot API page, snapshots it as JSON and regenerates
// typed artifacts. Never touches the hand-written src/types.ts.
//
// Usage:
//   node scripts/generate-bot-api.js              # download + regenerate everything
//   node scripts/generate-bot-api.js --input f    # use a saved HTML file instead of downloading
//
// Outputs:
//   scripts/bot-api/spec.json      parsed snapshot (methods, types, version)
//   scripts/bot-api/coverage.json  spec vs src/types.ts comparison (machine-readable)
//   scripts/bot-api/COVERAGE.md    same report for review
//   src/bot-api-types.ts           generated spec types (exported as `BotApi` namespace)
//   src/api-methods.ts             generated ApiMethods map

'use strict';

const fs = require('fs');
const path = require('path');
const { parseSpec } = require('./bot-api/parse');
const { emitTypes, emitMethods } = require('./bot-api/emit');
const {
    readDeclaredTypes,
    buildCoverage,
    renderCoverageMarkdown,
    defaultTypesFile,
} = require('./bot-api/coverage');

const ROOT = path.join(__dirname, '..');
const SPEC_URL = 'https://core.telegram.org/bots/api';

async function loadHtml(args) {
    const inputIndex = args.indexOf('--input');
    if (inputIndex >= 0) return fs.readFileSync(args[inputIndex + 1], 'utf8');
    const response = await fetch(SPEC_URL, { headers: { 'user-agent': 'vibegram-bot-api-sync' } });
    if (!response.ok) throw new Error(`Failed to download ${SPEC_URL}: HTTP ${response.status}`);
    return response.text();
}

function write(relativePath, content) {
    const target = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    console.log(`wrote ${relativePath}`);
}

async function main() {
    const html = await loadHtml(process.argv.slice(2));
    const spec = parseSpec(html);
    if (!spec.version || Object.keys(spec.methods).length === 0) {
        throw new Error('Parsed spec looks empty; the page layout may have changed.');
    }

    write('scripts/bot-api/spec.json', JSON.stringify(spec, null, 2) + '\n');
    write('src/bot-api-types.ts', emitTypes(spec));
    write('src/api-methods.ts', emitMethods(spec));

    const report = buildCoverage(spec, readDeclaredTypes(defaultTypesFile));
    write('scripts/bot-api/coverage.json', JSON.stringify(report, null, 2) + '\n');
    write('scripts/bot-api/COVERAGE.md', renderCoverageMarkdown(report));

    const s = report.summary;
    console.log(
        `Bot API ${spec.version}: ${s.specMethods} methods, ${s.specTypes} types; ` +
            `${report.missingTypes.length} missing types, ${report.missingFields.length} missing fields, ` +
            `${report.optionalityMismatches.length} optionality mismatches.`
    );
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
