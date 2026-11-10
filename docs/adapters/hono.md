# Hono Adapter

With a webhook, Telegram sends each update to your server as an HTTPS `POST`.
`createHonoHandler()` turns that request into a bot update in a Hono app, on Node.js,
Bun, Deno, or edge runtimes such as Cloudflare Workers.

```bash
npm install hono
```

## Quick Start

```typescript
import { Hono } from 'hono';
import { Bot, createHonoHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Hello from Hono!'));

const app = new Hono();
const webhook = createHonoHandler(bot, {
    secretToken: process.env.WEBHOOK_SECRET, // rejects requests not sent by Telegram
    healthPath: '/healthz',
});

app.post('/webhook', webhook); // Telegram's updates
app.get('/healthz', webhook); // uptime checks answer 200 OK

export default app;
```

Unlike the Fastify plugin, the handler does not register routes itself: you choose the
path with `app.post()`. Mount it on the `healthPath` route too if you want the health
check. Then point Telegram at the URL once:

```typescript
await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `secretToken` | none | Must equal the `secret_token` given to `setWebhook()` |
| `healthPath` | none | A `GET` to this path answers `200 OK` without touching the bot |

## Responses

| Status | When |
| --- | --- |
| `200` | The update was handled |
| `400` | The body is not JSON, or not a Telegram update |
| `403` | The secret token header is missing or wrong |
| `500` | A handler threw an error |

The response is sent after your handlers finish, and Telegram resends the update if it
fails or takes too long. On edge runtimes with short time limits, keep handlers quick.

Without Hono, use [`createFetchHandler()`](/adapters/fetch) directly on Workers, Deno,
Bun, or Next.js; it can also answer Telegram first and finish the work afterwards. See
all adapters side by side in [Framework Adapters](/adapters/express).
