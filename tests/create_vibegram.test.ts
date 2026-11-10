import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cli = require('../packages/create-vibegram/index.js') as {
    scaffold(options: { name: string; template: string; cwd?: string }): { dir: string };
    parseArgs(argv: string[]): { name?: string; template?: string; yes: boolean; help: boolean };
    TEMPLATES: Record<string, string>;
};

const REPO = resolve(__dirname, '..');
const workspace = mkdtempSync(join(tmpdir(), 'create-vibegram-'));
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

function listFiles(dir: string, prefix = ''): string[] {
    return readdirSync(dir).flatMap(entry => {
        const full = join(dir, entry);
        return statSync(full).isDirectory()
            ? listFiles(full, `${prefix}${entry}/`)
            : [`${prefix}${entry}`];
    });
}

/** Typecheck a generated project against the local vibegram sources (no npm install). */
function typecheck(dir: string, workers: boolean): string {
    const toPosix = (p: string) => p.replace(/\\/g, '/');
    if (workers) {
        writeFileSync(
            join(dir, 'src', 'workers-env.d.ts'),
            'interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; }\n'
        );
    }
    writeFileSync(
        join(dir, 'tsconfig.check.json'),
        JSON.stringify({
            extends: './tsconfig.json',
            compilerOptions: {
                module: 'ESNext',
                moduleResolution: 'Bundler',
                types: ['node'],
                typeRoots: [toPosix(join(REPO, 'node_modules', '@types'))],
                paths: {
                    vibegram: [toPosix(join(REPO, 'src', 'index.ts'))],
                    'vibegram/testing': [toPosix(join(REPO, 'src', 'testing.ts'))],
                    vitest: [toPosix(join(REPO, 'node_modules', 'vitest'))],
                },
            },
            include: ['src', 'test', 'scripts'],
        })
    );
    try {
        execFileSync(
            process.execPath,
            [join(REPO, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.check.json'],
            {
                cwd: dir,
                stdio: 'pipe',
            }
        );
        return '';
    } catch (error) {
        return String((error as { stdout?: Buffer }).stdout ?? error);
    }
}

/** Run the generated project's own tests with the repo's vitest, aliasing vibegram to src. */
function runTemplateTests(dir: string): string {
    const toPosix = (p: string) => p.replace(/\\/g, '/');
    writeFileSync(
        join(dir, 'vitest.check.config.mjs'),
        `export default {
    resolve: { alias: [
        { find: /^vibegram\\/testing$/, replacement: ${JSON.stringify(toPosix(join(REPO, 'src', 'testing.ts')))} },
        { find: /^vibegram$/, replacement: ${JSON.stringify(toPosix(join(REPO, 'src', 'index.ts')))} },
    ] },
    test: { include: ['test/**/*.test.ts'] },
};
`
    );
    return execFileSync(
        process.execPath,
        [
            join(REPO, 'node_modules', 'vitest', 'vitest.mjs'),
            'run',
            '--config',
            'vitest.check.config.mjs',
        ],
        { cwd: dir, stdio: 'pipe', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } }
    ).toString();
}

describe('create-vibegram', () => {
    it('parses CLI arguments', () => {
        expect(cli.parseArgs(['my-bot', '--template', 'ai-bot', '-y'])).toEqual({
            name: 'my-bot',
            template: 'ai-bot',
            yes: true,
            help: false,
        });
        expect(cli.parseArgs(['--template=polling']).template).toBe('polling');
        expect(() => cli.parseArgs(['a', 'b'])).toThrow(/Unknown argument/);
    });

    it('rejects invalid names, unknown templates, and non-empty directories', () => {
        expect(() =>
            cli.scaffold({ name: 'Bad Name', template: 'polling', cwd: workspace })
        ).toThrow(/Invalid project name/);
        expect(() => cli.scaffold({ name: 'ok-bot', template: 'nope', cwd: workspace })).toThrow(
            /Unknown template/
        );
        cli.scaffold({ name: 'taken', template: 'polling', cwd: workspace });
        expect(() => cli.scaffold({ name: 'taken', template: 'polling', cwd: workspace })).toThrow(
            /not empty/
        );
    });

    for (const template of Object.keys(cli.TEMPLATES)) {
        describe(template, () => {
            const name = `test-${template}`;
            let dir = '';

            it('scaffolds files with placeholders replaced and dotfiles renamed', () => {
                dir = cli.scaffold({ name, template, cwd: workspace }).dir;
                const files = listFiles(dir);

                expect(files).toEqual(
                    expect.arrayContaining([
                        '.gitignore',
                        '.env.example',
                        'package.json',
                        'src/bot.ts',
                    ])
                );
                expect(files.some(file => file.startsWith('_'))).toBe(false);
                for (const file of files) {
                    expect(readFileSync(join(dir, file), 'utf8'), file).not.toContain('{{');
                }

                const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
                expect(pkg.name).toBe(name);
                expect(pkg.dependencies.vibegram).toMatch(/^\^\d+\.\d+\.\d+$/);
            });

            it('typechecks against the current vibegram API', () => {
                expect(typecheck(dir, template === 'cloudflare-worker')).toBe('');
            }, 60_000);

            it("passes the template's own tests", () => {
                expect(runTemplateTests(dir)).toMatch(/Tests\s+\d+ passed/);
            }, 60_000);
        });
    }
});
