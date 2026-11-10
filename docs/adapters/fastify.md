# Fastify Adapter

With a webhook, Telegram sends each update to your server as an HTTPS `POST` instead of
your bot asking for updates (polling). `createFastifyPlugin()` registers that route on a
Fastify v4+ app, checks the request comes from Telegram, and passes the update to your bot.

```bash
npm install fastify
```

## Quick Start

```typescript
import Fastify from 'fastify';
import { Bot, createFastifyPlugin } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Hello from Fastify!'));

const fastify = Fastify({ logger: true });

await fastify.register(
    createFastifyPlugin(bot, {
        path: '/webhook', // POST route Telegram calls (default: /webhook)
        secretToken: process.env.WEBHOOK_SECRET, // rejects requests not sent by Telegram
        healthPath: '/healthz', // GET route for uptime checks
    })
);

await fastify.listen({ port: 3000, host: '0.0.0.0' });

// Tell Telegram where to send updates (once per deploy is enough).
await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});
```

Do not call `bot.launch()` as well: a bot uses either a webhook or polling, not both.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `path` | `/webhook` | Route for Telegram's `POST` requests. Must start with `/` |
| `secretToken` | none | Must equal the `secret_token` given to `setWebhook()` |
| `healthPath` | none | Adds a `GET` route that answers `200 OK` |

Fastify parses the JSON body itself, so no body-parser setup is needed.

## Responses

| Status | When |
| --- | --- |
| `200` | The update was handled |
| `400` | The body is not a Telegram update |
| `403` | The secret token header is missing or wrong |
| `500` | A handler threw an error |

The response is sent after your handlers finish. Telegram waits for it and resends the
update if it fails or takes too long, so keep handlers quick and move slow work (such as
[broadcasts](/advanced/queue)) out of the request.

See all adapters side by side in [Framework Adapters](/adapters/express).
