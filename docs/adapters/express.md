# Framework Adapters

VibeGram ships with first-class webhook adapters for all major Node.js HTTP frameworks. Every adapter automatically validates the `X-Telegram-Bot-Api-Secret-Token` header and the `update_id` field.

## Express.js

```bash
npm install express
```

```typescript
import express from 'express';
import { Bot, createExpressMiddleware } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

app.use(express.json());
app.post(
    '/webhook',
    createExpressMiddleware(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
    })
);

app.listen(3000, async () => {
    await bot.setWebhook(`https://your-domain.com/webhook`, {
        secret_token: process.env.WEBHOOK_SECRET,
    });
    console.log('Webhook server running on :3000');
});
```

## Fastify

```bash
npm install fastify
```

```typescript
import Fastify from 'fastify';
import { Bot, createFastifyPlugin } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const fastify = Fastify({ logger: true });

await fastify.register(
    createFastifyPlugin(bot, {
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
    })
);

await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

## Hono

Works with Cloudflare Workers, Bun, Deno, and Node.js:

```bash
npm install hono
```

```typescript
import { Hono } from 'hono';
import { Bot, createHonoHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = new Hono();

app.post(
    '/webhook',
    createHonoHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
    })
);

export default app;
```

## Koa

```bash
npm install koa @koa/router koa-body
```

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import { koaBody } from 'koa-body';
import { Bot, createKoaMiddleware } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = new Koa();
const router = new Router();

app.use(koaBody());
router.post(
    '/webhook',
    createKoaMiddleware(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
    })
);

app.use(router.routes());
app.listen(3000);
```

## Native Node.js HTTP

No framework needed:

```typescript
import http from 'http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

http.createServer(createNativeHandler(bot, { secretToken: process.env.WEBHOOK_SECRET })).listen(
    3000,
    () => console.log('Listening on :3000')
);
```

## AdapterOptions

All adapters accept an `AdapterOptions` object:

| Option             | Type     | Description                                                      |
| ------------------ | -------- | ---------------------------------------------------------------- |
| `secretToken`      | `string` | Token to validate `X-Telegram-Bot-Api-Secret-Token` header       |
| `path`             | `string` | Route path (Fastify only). Default: `'/webhook'`                 |
| `maxBodySizeBytes` | `number` | Maximum raw body size for the native adapter. Default: `1000000` |

## Response Codes

| Condition                             | HTTP Status                  |
| ------------------------------------- | ---------------------------- |
| Valid update processed                | `200 OK`                     |
| Secret token mismatch                 | `403 Forbidden`              |
| Missing / invalid `update_id`         | `400 Bad Request`            |
| Invalid content type (native adapter) | `415 Unsupported Media Type` |
| Payload too large (native adapter)    | `413 Payload Too Large`      |
| Update handling failed                | `500 Internal Server Error`  |
