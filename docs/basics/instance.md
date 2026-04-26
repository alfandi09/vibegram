# Bot Instance & Polling

<FeatureGrid title="Choose the launch mode first" description="Use polling for local development and native or adapter-based webhooks for production deployments.">
  <FeatureCard title="Polling" description="Simple long polling for local development and persistent worker processes." href="#polling-options" />
  <FeatureCard title="Native webhook" description="Let VibeGram own the HTTP server, webhook registration, health check, and shutdown." href="#webhook-mode" />
  <FeatureCard title="Framework adapters" description="Mount the webhook handler inside Express, Fastify, Hono, Koa, or native HTTP." href="/adapters/express" />
</FeatureGrid>

<SecurityNote title="Launch mode safety" variant="tip">
Prefer polling while developing locally. For production, use HTTPS webhooks with a secret token
and a health check endpoint.
</SecurityNote>

## Creating a Bot

```typescript
import { Bot } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
```

## Polling Options

Configure the polling behavior via the `options` parameter:

```typescript
const bot = new Bot('YOUR_BOT_TOKEN', {
    polling: {
        interval: 300, // ms between polls (default: 300)
        limit: 100, // max updates per poll (default: 100)
        timeout: 30, // long-polling timeout in seconds (default: 30)
        allowed_updates: [
            // filter update types (optional)
            'message',
            'callback_query',
            'chat_member',
        ],
    },
});
```

## Launch & Shutdown

```typescript
// Start polling
bot.launch().then(() => console.log('Bot running'));

// Graceful shutdown
bot.stop('Maintenance');

// Handle process signals
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
```

## Webhook Mode

For production deployments, use webhooks instead of polling:

```typescript
await bot.launch({
    webhook: {
        url: process.env.WEBHOOK_URL!,
        port: Number(process.env.PORT ?? 3000),
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    },
});
```

`launch({ webhook })` starts VibeGram's native HTTP server, registers the webhook with Telegram, and shuts down gracefully when `bot.stop()` or a process signal runs.

If you already own an Express, Fastify, Hono, Koa, or native HTTP server, mount a webhook adapter and register Telegram manually:

```typescript
import express from 'express';
import { createExpressMiddleware } from 'vibegram';

const app = express();
app.use(express.json());

const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);

await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000);
```

## Bot-Level Methods

These methods are available directly on the `Bot` instance:

| Method                             | Description                           |
| ---------------------------------- | ------------------------------------- |
| `bot.getMe()`                      | Get bot info (id, username, name)     |
| `bot.setMyCommands(commands)`      | Set the command menu                  |
| `bot.getMyCommands()`              | Get current command list              |
| `bot.deleteMyCommands()`           | Remove all commands                   |
| `bot.callApi(method, params)`      | Call any Telegram API method directly |
| `bot.validateWebAppData(initData)` | Validate Mini App data                |

```typescript
// Set up the command menu
await bot.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help' },
    { command: 'settings', description: 'Bot settings' },
]);

// Get bot information
const me = await bot.getMe();
console.log(`Running as @${me.username}`);
```
