import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    exports: Record<string, { import: string; require: string; types: string }>;
};

const publicSubpaths = [
    'adapters',
    'bot',
    'cache',
    'client',
    'composer',
    'context',
    'conversation',
    'errors',
    'filters',
    'i18n',
    'inline',
    'logger',
    'markup',
    'menu',
    'plugin',
    'queue',
    'ratelimit',
    'scene',
    'session',
    'types',
    'webapp',
    'wizard',
];

describe('package exports', () => {
    it('exposes dual CJS/ESM/type entries for every public subpath', () => {
        for (const subpath of publicSubpaths) {
            expect(packageJson.exports[`./${subpath}`]).toEqual({
                import: `./dist/esm/${subpath}.js`,
                require: `./dist/cjs/${subpath}.js`,
                types: `./dist/types/${subpath}.d.ts`,
            });
        }
    });
});
