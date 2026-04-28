/**
 * Example: Codex bot via session token (experimental).
 *
 * Usage:
 * 1. Create auth JSON with `codex login`.
 * 2. Deploy the file as a secret and set CODEX_AUTH_JSON_PATH.
 * 3. Set TELEGRAM_BOT_TOKEN.
 * 4. Run: npx ts-node examples/bot-codex.ts
 *
 * This provider targets chatgpt.com/backend-api/codex/responses, not
 * api.openai.com. Session tokens are valid only for the ChatGPT/Codex backend.
 */

import { Bot } from 'vibegram';
import { codex, codexProvider } from '../src';

function parseNumberList(value: string | undefined): number[] {
    if (!value) return [];

    return value
        .split(',')
        .map(item => Number(item.trim()))
        .filter(Number.isFinite);
}

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const authJsonPath = process.env.CODEX_AUTH_JSON_PATH;

if (!telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!authJsonPath) {
    throw new Error('CODEX_AUTH_JSON_PATH is required');
}

const provider = codexProvider({
    authJsonPath,
    accountId: process.env.CODEX_ACCOUNT_ID,
    deviceId: process.env.CODEX_DEVICE_ID,
    model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
    reasoningEffort: process.env.CODEX_REASONING_EFFORT as
        | 'low'
        | 'medium'
        | 'high'
        | 'xhigh'
        | undefined,
});

const bot = new Bot(telegramToken);

bot.use(
    codex({
        provider,
        systemPrompt:
            process.env.CODEX_SYSTEM_PROMPT ??
            'Kamu adalah asisten yang membantu dan berbicara dalam bahasa Indonesia.',
        maxPromptLength: Number(process.env.CODEX_MAX_PROMPT_LENGTH ?? 4000),
        maxHistory: Number(process.env.CODEX_MAX_HISTORY ?? 20),
        timeoutMs: Number(process.env.CODEX_TIMEOUT_MS ?? 60_000),
        commandPrefix: process.env.CODEX_COMMAND_PREFIX ?? 'codex',
        autoReply: process.env.CODEX_AUTO_REPLY !== 'false',
        groupMentionOnly: process.env.CODEX_GROUP_MENTION_ONLY !== 'false',
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        allowedUserIds: parseNumberList(process.env.CODEX_ALLOWED_USER_IDS),
        allowedChatIds: parseNumberList(process.env.CODEX_ALLOWED_CHAT_IDS),
        onAudit: event => {
            console.log(
                `[Codex Audit] user=${event.userId} chat=${event.chatId} ` +
                    `provider=${event.provider} model=${event.model ?? '?'} ` +
                    `success=${event.success} ${event.durationMs}ms` +
                    (event.error ? ` error="${event.error}"` : '')
            );
        },
    })
);

bot.start(async ctx => {
    await ctx.reply(
        [
            'Halo! Saya bot bertenaga Codex.',
            '',
            'Kirim pesan untuk mulai chat.',
            'Gunakan /codex help untuk melihat command yang tersedia.',
        ].join('\n')
    );
});

bot.launch().then(() => {
    console.log('Bot started (Codex mode)');
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
