# Deployment

VibeGram supports polling deployments for long-running Node.js processes and webhook
deployments through framework adapters.

## Polling on Railway or Render

Use polling when the platform gives you a persistent process.

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.start(ctx => ctx.reply('Running'));
bot.catch(error => console.error(error));

await bot.launch();
```

Configure:

- `BOT_TOKEN` as a secret environment variable.
- A Node.js runtime version of 18 or newer.
- A start command such as `node dist/bot.js`.

## Webhook with Express

Use webhooks when your platform provides an HTTPS URL.

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

## VPS with systemd

Build the app and run the compiled JavaScript:

```bash
npm ci
npm run build
node dist/bot.js
```

For `systemd`, set environment variables in an environment file readable only by the
service user.

## Release Safety

- Run lint, typechecks, tests, and build before deployment.
- Use HTTPS for every webhook.
- Set a Telegram webhook secret token.
- Do not log bot tokens or raw secret values.
