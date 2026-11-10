import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Agent/editor worktrees live inside the repo; never collect their tests.
        exclude: [
            ...configDefaults.exclude,
            '.claude/**',
            '**/.claude/**',
            // Scaffolding templates have their own tests, run via tests/create_vibegram.test.ts.
            'packages/*/templates/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/index.ts', 'src/types.ts'],
            thresholds: {
                // Aligned to actual coverage (lines ~69%, funcs ~71%, branches ~78%)
                // with headroom to avoid flaky CI gating. Raise incrementally as
                // deeper module coverage lands.
                lines: 60,
                functions: 65,
                branches: 75,
            },
        },
    },
});
