import { Bot } from '../src/index';
// @ts-ignore (assumes express is installed)
import express from 'express';

const bot = new Bot('YOUR_BOT_TOKEN');

// Use a secret token to prevent unauthorized webhook requests
const WEBHOOK_SECRET = 'my-secure-secret-token';

bot.command('start', async (ctx) => {
    await ctx.reply('Hello from Webhook mode!');
});

const app = express();

// Webhook requires JSON body parsing
app.use(express.json());

// Connect VibeGram to the Express endpoint with secret token validation
app.post('/telegram-webhook', bot.webhookCallback(WEBHOOK_SECRET));

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Express server running on port ${PORT}`);
    console.log(`Set your webhook URL to: https://your-domain.com/telegram-webhook`);

    // Register the webhook URL with Telegram:
    // await bot.callApi('setWebhook', {
    //     url: 'https://your-domain.com/telegram-webhook',
    //     secret_token: WEBHOOK_SECRET
    // });
});
