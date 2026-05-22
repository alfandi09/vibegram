import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    exports: Record<string, { import: string; require: string; types: string }>;
};

const publicSubpaths = [
    ['adapters', 'adapters'],
    ['bot', 'bot'],
    ['cache', 'cache'],
    ['client', 'client'],
    ['codex', 'codex/index'],
    ['composer', 'composer'],
    ['context', 'context'],
    ['conversation', 'conversation'],
    ['errors', 'errors'],
    ['filters', 'filters'],
    ['i18n', 'i18n'],
    ['inline', 'inline'],
    ['logger', 'logger'],
    ['markup', 'markup'],
    ['menu', 'menu'],
    ['plugin', 'plugin'],
    ['queue', 'queue'],
    ['ratelimit', 'ratelimit'],
    ['scene', 'scene'],
    ['session', 'session'],
    ['types', 'types'],
    ['webapp', 'webapp'],
    ['wizard', 'wizard'],
] as const;

describe('package exports', () => {
    it('exposes dual CJS/ESM/type entries for every public subpath', () => {
        for (const [subpath, distPath] of publicSubpaths) {
            expect(packageJson.exports[`./${subpath}`]).toEqual({
                import: `./dist/esm/${distPath}.js`,
                require: `./dist/cjs/${distPath}.js`,
                types: `./dist/types/${distPath}.d.ts`,
            });
        }
    });
});
