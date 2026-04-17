import { Bot } from '../src/index';

export function createWebhookExample(
    token: string = 'YOUR_BOT_TOKEN',
    secretToken: string = 'my-secure-secret-token'
) {
    const bot = new Bot(token);

    bot.command('start', async ctx => {
        await ctx.reply('Hello from Webhook mode!');
    });

    return {
        bot,
        secretToken,
        createApp(expressFactory?: any) {
            const express = expressFactory ?? require('express');
            const app = express();

            app.use(express.json());
            app.post('/telegram-webhook', bot.webhookCallback(secretToken));

            return app;
        },
    };
}

if (require.main === module) {
    const example = createWebhookExample(
        process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN',
        process.env.WEBHOOK_SECRET || 'my-secure-secret-token'
    );
    const app = example.createApp();
    const port = Number(process.env.PORT || 3000);

    app.listen(port, async () => {
        console.log(`Express server running on port ${port}`);
        console.log('Set your webhook URL to: https://your-domain.com/telegram-webhook');

        // Register the webhook URL with Telegram:
        // await example.bot.callApi('setWebhook', {
        //     url: 'https://your-domain.com/telegram-webhook',
        //     secret_token: example.secretToken
        // });
    });
}
