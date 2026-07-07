# Webhook Security

<SecurityNote title="Production webhook rule" variant="warning">
Every production webhook should terminate HTTPS, validate Telegram's secret token, keep
body limits explicit, and expose a lightweight health route.
</SecurityNote>

<FeatureGrid title="Webhook hardening path" description="Start with native launch mode, then move to framework adapters when you already own the HTTP server.">
  <FeatureCard title="Native launch mode" description="Let VibeGram own the HTTP server lifecycle." href="#native-launch-mode" />
  <FeatureCard title="Framework adapters" description="Mount a secure webhook handler in Express, Fastify, Hono, Koa, or native HTTP." href="#framework-adapters" />
  <FeatureCard title="Body limits" description="Reject oversized payloads before JSON parsing reaches your handlers." href="#body-limits" />
</FeatureGrid>

## Setup

```typescript
import express from 'express';
import { Bot, createExpressMiddleware } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', express.json({ limit: '1mb' }), webhook);
app.get('/healthz', webhook);

await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000);
```

## How It Works

1. You register the webhook with Telegram and include `secret_token`.
2. Telegram sends that value in `X-Telegram-Bot-Api-Secret-Token`.
3. VibeGram validates the header before processing the update.
4. Invalid or missing tokens receive `403 Forbidden`.
5. Malformed update bodies receive `400 Bad Request`.

## Native Launch Mode

For standalone deployments, `bot.launch({ webhook })` can create the HTTP server,
register the webhook, and shut down gracefully:

```typescript
await bot.launch({
    webhook: {
        url: process.env.WEBHOOK_URL!,
        port: Number(process.env.PORT ?? 3000),
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
        maxBodySizeBytes: 1_000_000,
    },
});
```

`healthPath` returns `200 OK` without validating the Telegram secret token or
processing an update body.

## Framework Adapters

All webhook adapters support the same `secretToken` and `healthPath` shape:

| Adapter | Import | Notes |
| --- | --- | --- |
| Express | `createExpressMiddleware` | Mount body parser only on the webhook route |
| Fastify | `createFastifyPlugin` | Use Fastify's `bodyLimit` for payload caps |
| Hono | `createHonoHandler` | Pair with runtime/platform body limits |
| Koa | `createKoaMiddleware` | Use `koaBody({ jsonLimit: '1mb' })` |
| Native HTTP | `createNativeHandler` | Uses `maxBodySizeBytes` directly |

## Body Limits

Telegram updates are small in normal use. Keep limits tight enough to protect
your parser and infrastructure:

| Adapter | Where to set the limit |
| --- | --- |
| Native `bot.launch({ webhook })` / `createNativeHandler()` | `maxBodySizeBytes`, default 1 MB |
| Express | `express.json({ limit: '1mb' })` |
| Fastify | `Fastify({ bodyLimit: 1_000_000 })` |
| Hono | Platform/runtime request body limit |
| Koa | `koaBody({ jsonLimit: '1mb' })` |

Do not mount a broad unlimited body parser before webhook secret validation.

## Register and Remove Webhooks

```typescript
await bot.setWebhook(`${process.env.WEBHOOK_URL}/webhook`, {
    secret_token: process.env.WEBHOOK_SECRET,
    max_connections: 100,
    allowed_updates: ['message', 'callback_query'],
});

const info = await bot.getWebhookInfo();
console.log(info.pending_update_count);

await bot.deleteWebhook({ drop_pending_updates: true });
```

## Deployment Checklist

1. Terminate TLS in front of the webhook endpoint.
2. Set a random `secret_token` and keep it in environment variables.
3. Accept `POST` only on the webhook route.
4. Mount JSON parsing only on the webhook route with a size limit.
5. Expose a lightweight health endpoint for platform probes.
6. Do not log bot tokens, webhook secrets, or raw request headers.

## Without Secret Token

```typescript
app.post('/webhook', bot.webhookCallback());
```

::: warning
Without a secret token, any client that knows your webhook URL can send fake updates.
Always use a secret token in production.
:::
