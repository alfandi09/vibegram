const { readdirSync, existsSync, statSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const root = join(__dirname, '..');
const pluginsDir = join(root, 'plugins');
const requestedScript = process.argv[2] ?? 'validate';
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function getPluginPackages() {
    if (!existsSync(pluginsDir)) return [];

    return readdirSync(pluginsDir)
        .map(name => ({ name, dir: join(pluginsDir, name) }))
        .filter(entry => {
            if (entry.name.startsWith('_')) return false;
            if (!statSync(entry.dir).isDirectory()) return false;
            return existsSync(join(entry.dir, 'package.json'));
        });
}

function runNpmScript(plugin, scriptName) {
    const result = spawnSync(npmCommand, ['run', scriptName], {
        cwd: plugin.dir,
        stdio: 'inherit',
        shell: isWindows,
    });

    if (result.status !== 0) {
        const reason = result.error ? `: ${result.error.message}` : '';
        throw new Error(
            `Plugin "${plugin.name}" failed npm run ${scriptName} with exit code ${result.status}${reason}.`
        );
    }
}

function scriptsForRequest(scriptName) {
    if (scriptName === 'validate') {
        return ['typecheck', 'test', 'build'];
    }
    return [scriptName];
}

const plugins = getPluginPackages();

if (plugins.length === 0) {
    console.log('[plugins] No official plugin packages found. Skipping.');
    process.exit(0);
}

const scripts = scriptsForRequest(requestedScript);

for (const plugin of plugins) {
    console.log(`[plugins] ${plugin.name}: ${scripts.join(', ')}`);
    for (const script of scripts) {
        runNpmScript(plugin, script);
    }
}

console.log(`[plugins] ${plugins.length} plugin package(s) validated.`);
