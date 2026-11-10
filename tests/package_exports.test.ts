import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    exports: Record<string, { import: string; require: string; types: string } | string>;
    typesVersions?: Record<string, Record<string, string[]>>;
    optionalDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
    peerDependencies?: Record<string, string>;
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
    ['dedupe', 'dedupe'],
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

    it('lists the types condition first so TypeScript resolves declarations', () => {
        for (const [key, entry] of Object.entries(packageJson.exports)) {
            if (typeof entry === 'string') continue;
            expect(Object.keys(entry)[0], key).toBe('types');
        }
    });

    it('exposes package.json for tooling that reads the package version', () => {
        expect(packageJson.exports['./package.json']).toBe('./package.json');
    });

    it('maps every subpath in typesVersions for moduleResolution node10 consumers', () => {
        const typesVersions = packageJson.typesVersions?.['*'] ?? {};
        for (const [subpath, distPath] of publicSubpaths) {
            expect(typesVersions[subpath]).toEqual([`dist/types/${distPath}.d.ts`]);
        }
    });

    it('does not publish retired HTTP client packages as runtime dependencies', () => {
        const retiredPackages = ['axios', 'form-data', 'follow-redirects'];
        const runtimeDependencySections = [
            packageJson.dependencies,
            packageJson.optionalDependencies,
            packageJson.peerDependencies,
            packageJson.overrides,
        ];

        for (const dependencySection of runtimeDependencySections) {
            for (const retiredPackage of retiredPackages) {
                expect(dependencySection ?? {}).not.toHaveProperty(retiredPackage);
            }
        }
    });
});
