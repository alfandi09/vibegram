/**
 * Live Telegram smoke test for @vibegram/codex.
 *
 * Required env:
 * - TELEGRAM_BOT_TOKEN
 *
 * Provider env:
 * - CODEX_AUTH_JSON_PATH    - recommended auth file path
 * - CODEX_ACCESS_TOKEN      - optional direct token fallback
 *
 * Optional env:
 * - TELEGRAM_BOT_USERNAME   - required for group auto-reply mention detection
 * - CODEX_MODEL             - default: gpt-5.3-codex
 * - CODEX_REASONING_EFFORT  - low|medium|high|xhigh
 * - CODEX_ACCOUNT_ID        - ChatGPT account id header override
 * - CODEX_DEVICE_ID         - stable device id (random UUID if omitted)
 * - CODEX_ALLOWED_USER_IDS  - comma-separated Telegram user IDs
 * - CODEX_ALLOWED_CHAT_IDS  - comma-separated Telegram chat IDs
 * - CODEX_AUTO_REPLY        - true|false (default: true)
 * - CODEX_SYSTEM_PROMPT     - custom system prompt
 *
 * Legacy GPT_* and CHATGPT_* env names are still accepted as fallbacks.
 */

import { Bot } from 'vibegram';
import type * as CodexPackage from '../src';

const {
    codex,
    codexProvider,
} = require('../dist/cjs/index.js') as typeof CodexPackage;

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value;
}

function readEnv(name: string, legacyName?: string): string | undefined {
    return process.env[name] ?? (legacyName ? process.env[legacyName] : undefined);
}

function parseNumberList(value: string | undefined): number[] {
    if (!value) return [];

    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => Number(item))
        .filter(item => Number.isFinite(item));
}

async function main() {
    const bot = new Bot(requireEnv('TELEGRAM_BOT_TOKEN'));

    const provider = codexProvider({
        accessToken: readEnv('CODEX_ACCESS_TOKEN', 'CHATGPT_ACCESS_TOKEN'),
        authJsonPath: readEnv('CODEX_AUTH_JSON_PATH', 'CHATGPT_AUTH_JSON_PATH'),
        accountId: readEnv('CODEX_ACCOUNT_ID', 'CHATGPT_ACCOUNT_ID'),
        deviceId: readEnv('CODEX_DEVICE_ID', 'CHATGPT_DEVICE_ID'),
        reasoningEffort: readEnv('CODEX_REASONING_EFFORT', 'GPT_REASONING_EFFORT') as
            | 'low'
            | 'medium'
            | 'high'
            | 'xhigh'
            | undefined,
        model: readEnv('CODEX_MODEL', 'GPT_MODEL') ?? 'gpt-5.3-codex',
    });

    bot.use(
        codex({
            provider,
            systemPrompt:
                readEnv('CODEX_SYSTEM_PROMPT', 'GPT_SYSTEM_PROMPT') ??
                'Kamu adalah asisten Telegram yang ringkas, ramah, dan menjawab dalam bahasa Indonesia.',
            maxPromptLength: Number(readEnv('CODEX_MAX_PROMPT_LENGTH', 'GPT_MAX_PROMPT_LENGTH') ?? 4000),
            maxResponseLength: Number(readEnv('CODEX_MAX_RESPONSE_LENGTH', 'GPT_MAX_RESPONSE_LENGTH') ?? 3500),
            maxHistory: Number(readEnv('CODEX_MAX_HISTORY', 'GPT_MAX_HISTORY') ?? 20),
            timeoutMs: Number(readEnv('CODEX_TIMEOUT_MS', 'GPT_TIMEOUT_MS') ?? 60_000),
            commandPrefix: readEnv('CODEX_COMMAND_PREFIX', 'GPT_COMMAND_PREFIX') ?? 'codex',
            autoReply: readEnv('CODEX_AUTO_REPLY', 'GPT_AUTO_REPLY') !== 'false',
            groupMentionOnly: readEnv('CODEX_GROUP_MENTION_ONLY', 'GPT_GROUP_MENTION_ONLY') !== 'false',
            botUsername: process.env.TELEGRAM_BOT_USERNAME,
            allowedUserIds: parseNumberList(readEnv('CODEX_ALLOWED_USER_IDS', 'GPT_ALLOWED_USER_IDS')),
            allowedChatIds: parseNumberList(readEnv('CODEX_ALLOWED_CHAT_IDS', 'GPT_ALLOWED_CHAT_IDS')),
            onAudit: event => {
                console.log(
                    `[codex-live] user=${event.userId} chat=${event.chatId} ` +
                        `provider=${event.provider} model=${event.model ?? '?'} ` +
                        `success=${event.success} duration=${event.durationMs}ms` +
                        (event.error ? ` error="${event.error}"` : '')
                );
            },
        })
    );

    bot.start(async ctx => {
        await ctx.reply(
            [
                'Codex live test aktif!',
                '',
                'Commands:',
                '/codex status - Cek status provider & usage',
                '/codex models - List model tersedia',
                '/codex ask <teks> - Tanya GPT',
                '/codex personality <teks> - Set instruksi custom',
                '/codex personality - Lihat personality saat ini',
                '/codex personality reset - Reset personality',
                '/codex reset - Hapus riwayat percakapan',
                '',
                'Kirim pesan biasa untuk auto-reply di DM.',
            ].join('\n')
        );
    });

    const info = await bot.getMe();
    console.log(`[codex-live] starting @${info.username ?? info.first_name}`);
    console.log(`[codex-live] provider=${provider.name}`);
    console.log('[codex-live] Press Ctrl+C to stop.');

    await bot.launch();

    const stop = async () => {
        console.log('\n[codex-live] stopping...');
        await bot.stop();
        process.exit(0);
    };

    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
}

main().catch(error => {
    console.error('[codex-live] failed:', error);
    process.exit(1);
});
