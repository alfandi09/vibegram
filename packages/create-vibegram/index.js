#!/usr/bin/env node
'use strict';

/**
 * create-vibegram — scaffold a new vibegram Telegram bot.
 *
 *   npm create vibegram@latest my-bot
 *   npm create vibegram@latest my-bot -- --template cloudflare-worker
 *
 * Zero dependencies; uses only Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMPLATES = {
    polling: 'Long-polling bot with commands, sessions, and offline tests',
    'cloudflare-worker': 'Webhook bot for Cloudflare Workers (createFetchHandler)',
    'ai-bot': 'Streaming AI replies with drafts and a stop button (ReplyStreamer)',
};

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const RENAMES = { _gitignore: '.gitignore', '_env.example': '.env.example' };

function usage() {
    return [
        'Usage: npm create vibegram@latest <project-name> -- [--template <name>] [--yes]',
        '',
        'Templates:',
        ...Object.entries(TEMPLATES).map(
            ([name, description]) => `  ${name.padEnd(18)} ${description}`
        ),
    ].join('\n');
}

function parseArgs(argv) {
    const options = { name: undefined, template: undefined, yes: false, help: false };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--yes' || arg === '-y') options.yes = true;
        else if (arg === '--template' || arg === '-t') options.template = argv[++index];
        else if (arg.startsWith('--template=')) options.template = arg.slice('--template='.length);
        else if (!arg.startsWith('-') && options.name === undefined) options.name = arg;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return options;
}

function validateName(name) {
    if (!/^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
        throw new Error(
            `Invalid project name "${name}". Use lowercase letters, digits, "-", "_", or "." (npm package rules).`
        );
    }
}

function ask(question, fallback) {
    if (!process.stdin.isTTY) return Promise.resolve(fallback);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve =>
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim() || fallback);
        })
    );
}

function copyTemplate(sourceDir, targetDir, replacements) {
    fs.mkdirSync(targetDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const from = path.join(sourceDir, entry.name);
        const to = path.join(targetDir, RENAMES[entry.name] || entry.name);
        if (entry.isDirectory()) {
            copyTemplate(from, to, replacements);
            continue;
        }
        let content = fs.readFileSync(from, 'utf8');
        for (const [token, value] of Object.entries(replacements)) {
            content = content.split(token).join(value);
        }
        fs.writeFileSync(to, content);
    }
}

/**
 * Create a project. Exported for tests; the CLI calls it from main().
 * @returns {{ dir: string, template: string }}
 */
function scaffold({ name, template, cwd = process.cwd() }) {
    validateName(name);
    if (!Object.prototype.hasOwnProperty.call(TEMPLATES, template)) {
        throw new Error(`Unknown template "${template}".\n\n${usage()}`);
    }

    const dir = path.resolve(cwd, name.replace(/^@[^/]+\//, ''));
    if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        throw new Error(`Directory "${dir}" already exists and is not empty.`);
    }

    const ownPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    copyTemplate(path.join(TEMPLATE_DIR, template), dir, {
        '{{PROJECT_NAME}}': name,
        '{{VIBEGRAM_VERSION}}': ownPackage.vibegramVersion,
    });
    return { dir, template };
}

async function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`${error.message}\n\n${usage()}`);
        process.exitCode = 1;
        return;
    }
    if (options.help) {
        console.log(usage());
        return;
    }

    const name =
        options.name ||
        (options.yes
            ? 'my-vibegram-bot'
            : await ask('Project name (my-vibegram-bot): ', 'my-vibegram-bot'));
    let template = options.template;
    if (!template) {
        const names = Object.keys(TEMPLATES);
        const list = names
            .map((entry, index) => `  ${index + 1}. ${entry} — ${TEMPLATES[entry]}`)
            .join('\n');
        const answer = options.yes
            ? '1'
            : await ask(`Template:\n${list}\nChoose 1-${names.length} (1): `, '1');
        template = names[Number(answer) - 1] || answer;
    }

    try {
        const { dir } = scaffold({ name, template });
        const relative = path.relative(process.cwd(), dir) || '.';
        console.log(`\nCreated ${template} bot in ${relative}\n`);
        console.log('Next steps:');
        console.log(`  cd ${relative}`);
        console.log('  npm install');
        console.log('  cp .env.example .env   # add your BOT_TOKEN from @BotFather');
        console.log(template === 'cloudflare-worker' ? '  npm run deploy' : '  npm run dev');
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { scaffold, parseArgs, TEMPLATES };

if (require.main === module) {
    void main();
}
