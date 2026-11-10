# Native HTTP Adapter

`createNativeHandler()` serves a webhook with Node's built-in `http` module, without
Express, Fastify, or Koa. It reads and checks the request body itself, so there is
nothing else to install.

## Quick Start

```typescript
import http from 'node:http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Hello from plain Node.js!'));

const server = http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET, // rejects requests not sent by Telegram
        healthPath: '/healthz', // GET /healthz answers 200 OK
        maxBodySizeBytes: 1_000_000, // refuse bodies over 1 MB
    })
);

server.listen(3000, async () => {
    await bot.setWebhook('https://your-domain.com/webhook', {
        secret_token: process.env.WEBHOOK_SECRET,
    });
    console.log('Listening on :3000');
});
```

The handler answers **every** path on the server, so the webhook URL can use any path.
Put a reverse proxy (nginx, Caddy) or your platform's load balancer in front for HTTPS:
Telegram only calls `https://` URLs.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `secretToken` | none | Must equal the `secret_token` given to `setWebhook()` |
| `healthPath` | none | A `GET` to this path answers `200 OK` |
| `maxBodySizeBytes` | `1_000_000` (1 MB) | Larger bodies are refused before parsing |

## Responses

| Status | When |
| --- | --- |
| `200` | The update was handled (or the request was not a `POST`) |
| `400` | The body is not JSON, or not a Telegram update |
| `403` | The secret token header is missing or wrong |
| `413` | The body is larger than `maxBodySizeBytes` |
| `415` | `Content-Type` is not `application/json` |
| `500` | A handler threw an error |

The response is sent after your handlers finish, and Telegram resends the update if it
fails or takes too long, so keep handlers quick.

See all adapters side by side in [Framework Adapters](/adapters/express).
