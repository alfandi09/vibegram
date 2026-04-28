/**
 * Live Telegram smoke test for @vibegram/codex.
 *
 * Required env:
 * - TELEGRAM_BOT_TOKEN
 *
 * Provider env (ChatGPT/Codex session token):
 * - CHATGPT_ACCESS_TOKEN or CHATGPT_AUTH_JSON_PATH
 *   (defaults to ~/.codex/auth.json if neither is set)
 *
 * Optional env:
 * - TELEGRAM_BOT_USERNAME   — required for group auto-reply mention detection
 * - GPT_MODEL               — default: gpt-5.3-codex
 * - GPT_REASONING_EFFORT    — low|medium|high|xhigh
 * - CHATGPT_ACCOUNT_ID      — ChatGPT account id header override
 * - CHATGPT_DEVICE_ID       — stable device id (random UUID if omitted)
 * - GPT_ALLOWED_USER_IDS    — comma-separated Telegram user IDs
 * - GPT_ALLOWED_CHAT_IDS    — comma-separated Telegram chat IDs
 * - GPT_AUTO_REPLY           — true|false (default: true)
 * - GPT_SYSTEM_PROMPT        — custom system prompt
 *
 * NOTE: This provider uses chatgpt.com/backend-api/codex/responses
 *       (NOT api.openai.com). Session tokens are only valid at that endpoint.
 *       Auto-refresh is enabled by default if refresh_token is in auth.json.
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
        accessToken: process.env.CHATGPT_ACCESS_TOKEN,
        authJsonPath: process.env.CHATGPT_AUTH_JSON_PATH,
        accountId: process.env.CHATGPT_ACCOUNT_ID,
        deviceId: process.env.CHATGPT_DEVICE_ID,
        reasoningEffort: process.env.GPT_REASONING_EFFORT as
            | 'low'
            | 'medium'
            | 'high'
            | 'xhigh'
            | undefined,
        model: process.env.GPT_MODEL ?? 'gpt-5.3-codex',
    });

    bot.use(
        codex({
            provider,
            systemPrompt:
                process.env.GPT_SYSTEM_PROMPT ??
                'Kamu adalah asisten Telegram yang ringkas, ramah, dan menjawab dalam bahasa Indonesia.',
            maxPromptLength: Number(process.env.GPT_MAX_PROMPT_LENGTH ?? 4000),
            maxResponseLength: Number(process.env.GPT_MAX_RESPONSE_LENGTH ?? 3500),
            maxHistory: Number(process.env.GPT_MAX_HISTORY ?? 20),
            timeoutMs: Number(process.env.GPT_TIMEOUT_MS ?? 60_000),
            commandPrefix: process.env.GPT_COMMAND_PREFIX ?? 'codex',
            autoReply: process.env.GPT_AUTO_REPLY !== 'false',
            groupMentionOnly: process.env.GPT_GROUP_MENTION_ONLY !== 'false',
            botUsername: process.env.TELEGRAM_BOT_USERNAME,
            allowedUserIds: parseNumberList(process.env.GPT_ALLOWED_USER_IDS),
            allowedChatIds: parseNumberList(process.env.GPT_ALLOWED_CHAT_IDS),
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
                '🤖 Codex live test aktif!',
                '',
                'Commands:',
                '/codex status — Cek status provider & usage',
                '/codex models — List model tersedia',
                '/codex ask <teks> — Tanya GPT',
                '/codex personality <teks> — Set instruksi custom',
                '/codex personality — Lihat personality saat ini',
                '/codex personality reset — Reset personality',
                '/codex reset — Hapus riwayat percakapan',
                '',
                'Kirim pesan biasa untuk auto-reply (di DM).',
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
