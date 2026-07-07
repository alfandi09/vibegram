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

const bot = new Bot(process.env.BOT_TOKEN!);
```

Keep tokens in environment variables. `launch()` validates the token with `getMe()`
before polling or webhook mode starts.

## Polling Options

Configure polling through the constructor:

```typescript
const bot = new Bot(process.env.BOT_TOKEN!, {
    polling: {
        interval: 300,
        limit: 100,
        timeout: 30,
        offsetCommit: 'received',
        allowed_updates: ['message', 'callback_query', 'chat_member'],
    },
});
```

`offsetCommit` controls when VibeGram advances the Telegram polling offset:

| Value | Behavior | Tradeoff |
| --- | --- | --- |
| `'received'` | Advance before your handler runs. | Backward compatible and avoids repeated failing updates, but a crash can drop an update. |
| `'processed'` | Advance only after `handleUpdate()` succeeds. | Safer for at-least-once processing, but failed handlers can retry the same update. Use idempotent handlers or `dedupeUpdates()`. |

Start polling with an optional startup callback:

```typescript
await bot.launch({
    onStart: me => {
        console.log(`Bot @${me.username} is online`);
    },
});
```

## Launch & Shutdown

`launch()` registers graceful shutdown handlers for `SIGINT` and `SIGTERM`. You can
also stop the bot manually:

```typescript
await bot.launch();
await bot.stop('Maintenance');
```

For custom process handling:

```typescript
process.once('SIGINT', () => void bot.stop('SIGINT'));
process.once('SIGTERM', () => void bot.stop('SIGTERM'));
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

`launch({ webhook })` starts VibeGram's native HTTP server, registers the webhook
with Telegram, and shuts down gracefully when `bot.stop()` or a process signal runs.

If you already own an Express, Fastify, Hono, Koa, or native HTTP server, mount a
webhook adapter and register Telegram manually:

```typescript
import express from 'express';
import { createExpressMiddleware } from 'vibegram';

const app = express();
app.use(express.json({ limit: '1mb' }));

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

| Method | Description |
| --- | --- |
| `bot.launch(opts?)` | Start polling or native webhook mode |
| `bot.stop(reason?)` | Stop polling or webhook mode gracefully |
| `bot.handleUpdate(update)` | Process an update manually |
| `bot.setWebhook(url, opts?)` | Register a webhook URL with Telegram |
| `bot.deleteWebhook(opts?)` | Delete the active webhook |
| `bot.getWebhookInfo()` | Read active webhook information |
| `bot.getMe()` | Get bot identity |
| `bot.setMyCommands(commands)` | Set visible command menu |
| `bot.deleteMyCommands()` | Remove visible command menu |
| `bot.use(...middlewares)` | Register global middleware |
| `bot.command(cmd, handler)` | Handle `/cmd` |
| `bot.hears(trigger, handler)` | Match text or regex |
| `bot.action(data, handler)` | Handle callback query data |
| `bot.on(type, handler)` | Handle a specific update type |
