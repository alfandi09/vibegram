# Deployment

VibeGram bisa berjalan dengan polling pada proses Node.js yang persistent atau webhook
melalui adapter framework.

## Polling

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.start(ctx => ctx.reply('Bot berjalan'));
bot.catch(error => console.error(error));

await bot.launch();
```

## Webhook Express

```typescript
import express from 'express';
import { Bot, createExpressMiddleware } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

app.use(express.json());
app.post(
    '/webhook',
    createExpressMiddleware(bot, {
        secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    })
);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

await bot.setWebhook(`${process.env.PUBLIC_URL}/webhook`, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
});

app.listen(Number(process.env.PORT || 3000));
```

## Checklist

- Gunakan HTTPS untuk webhook.
- Set secret token webhook Telegram.
- Jangan log token bot.
- Jalankan lint, typecheck, test, dan build sebelum release.
