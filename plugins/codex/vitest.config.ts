import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Inside the monorepo, resolve the vibegram peer dependency to the core sources.
export default defineConfig({
    resolve: {
        alias: [
            { find: /^vibegram$/, replacement: resolve(__dirname, '../../src/index.ts') },
            { find: /^vibegram\/(.*)$/, replacement: resolve(__dirname, '../../src/$1.ts') },
        ],
    },
});
