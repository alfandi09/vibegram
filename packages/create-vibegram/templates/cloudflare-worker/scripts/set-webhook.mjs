// Registers the deployed Worker URL with Telegram. Run: npm run set-webhook
import { Bot } from 'vibegram';

const { BOT_TOKEN, WEBHOOK_SECRET, WEBHOOK_URL } = process.env;
if (!BOT_TOKEN || !WEBHOOK_SECRET || !WEBHOOK_URL) {
    throw new Error('Set BOT_TOKEN, WEBHOOK_SECRET, and WEBHOOK_URL in .env');
}

const bot = new Bot(BOT_TOKEN);
await bot.setWebhook(WEBHOOK_URL, { secret_token: WEBHOOK_SECRET });
console.log('Webhook set:', (await bot.getWebhookInfo()).url);
