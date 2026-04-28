/**
 * Example: Codex Bot via session token (EXPERIMENTAL)
 *
 * Cara pakai:
 * 1. Pastikan file auth JSON tersedia (dari `codex login`), atau tempelkan
 *    access_token langsung ke BOT_GPT_ACCESS_TOKEN env var.
 * 2. Set TELEGRAM_BOT_TOKEN di .env
 * 3. Jalankan: npx ts-node examples/bot-codex.ts
 *
 * CATATAN: Provider ini mengarah ke chatgpt.com/backend-api/codex/responses
 *          (endpoint internal ChatGPT), BUKAN api.openai.com.
 *          Token session dari Codex hanya valid di endpoint ini.
 *
 * PERINGATAN: Token ini berumur pendek (~1 jam, auto-refresh tersedia).
 *             Ketika refresh gagal, bot akan memberitahu user dan tidak crash.
 */

import { Bot } from 'vibegram';
import { codex, codexProvider, codexProviderFromJson } from '../src';

// Pilih salah satu cara inisialisasi provider:

// Cara 1: Dari file auth JSON Codex (auto-detect default path)
const provider1 = codexProvider({
    // authJsonPath: path.join(os.homedir(), '.codex', 'auth.json'), // default
    model: 'gpt-5.3-codex',
});

// Cara 2: Access token langsung dari env var
// const provider2 = codexProvider({
//     accessToken: process.env.BOT_GPT_ACCESS_TOKEN!,
//     model: 'gpt-5.3-codex',
// });

// Cara 3: Dari JSON object (misalnya dari database / secret manager)
// const authData = JSON.parse(fs.readFileSync('/path/to/auth.json', 'utf-8'));
// const provider3 = codexProviderFromJson(authData, { model: 'gpt-5.3-codex' });

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Pasang plugin Codex
bot.use(
    codex({
        provider: provider1,
        systemPrompt: 'Kamu adalah asisten yang membantu dan berbicara dalam bahasa Indonesia.',
        maxPromptLength: 4000,
        maxHistory: 20,
        timeoutMs: 60_000,
        commandPrefix: 'codex',
        autoReply: true,       // Balas semua pesan di direct chat
        groupMentionOnly: true, // Di group: hanya balas kalau di-mention
        botUsername: process.env.TELEGRAM_BOT_USERNAME, // required for group auto-reply

        onAudit: (event) => {
            console.log(
                `[Codex Audit] user=${event.userId} chat=${event.chatId} ` +
                `provider=${event.provider} model=${event.model ?? '?'} ` +
                `success=${event.success} ${event.durationMs}ms` +
                (event.error ? ` error="${event.error}"` : '')
            );
        },
    })
);

// Start command
bot.start(async (ctx) => {
    await ctx.reply(
        '👋 Halo! Saya bot bertenaga Codex.\n\n' +
        'Kirim pesan apapun untuk mulai chat.\n' +
        'Gunakan /codex help untuk melihat command yang tersedia.'
    );
});

bot.launch().then(() => {
    console.log('Bot started (Codex mode)');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
