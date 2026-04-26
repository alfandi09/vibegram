# Framework Adapters

<FeatureGrid title="Pick an adapter by runtime" description="All adapters share secret token validation, update payload checks, health routes, and consistent HTTP responses.">
  <FeatureCard title="Express and Koa" description="Use middleware when you already own routing and JSON body parsing." href="#express-js" />
  <FeatureCard title="Fastify and Hono" description="Use plugin or handler APIs for framework-native webhook routing." href="#fastify" />
  <FeatureCard title="Native HTTP" description="Avoid framework overhead while keeping body limits and health checks explicit." href="#native-node-js-http" />
</FeatureGrid>

<CompatibilityTable />

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
const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);

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
        healthPath: '/healthz',
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
const webhook = createHonoHandler(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);

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
const webhook = createKoaMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

router.post('/webhook', webhook);
router.get('/healthz', webhook);

app.use(router.routes());
app.listen(3000);
```

## Native Node.js HTTP

No framework needed:

```typescript
import http from 'http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    })
).listen(3000, () => console.log('Listening on :3000'));
```

## AdapterOptions

All adapters accept an `AdapterOptions` object:

| Option             | Type     | Description                                                        |
| ------------------ | -------- | ------------------------------------------------------------------ |
| `secretToken`      | `string` | Token to validate `X-Telegram-Bot-Api-Secret-Token` header         |
| `path`             | `string` | Route path (Fastify only). Default: `'/webhook'`                   |
| `healthPath`       | `string` | Optional GET path that returns `200 OK` without processing updates |
| `maxBodySizeBytes` | `number` | Maximum raw body size for the native adapter. Default: `1000000`   |

## Response Codes

| Condition                             | HTTP Status                  |
| ------------------------------------- | ---------------------------- |
| Valid update processed                | `200 OK`                     |
| Health check path hit                 | `200 OK`                     |
| Secret token mismatch                 | `403 Forbidden`              |
| Missing / invalid `update_id`         | `400 Bad Request`            |
| Invalid content type (native adapter) | `415 Unsupported Media Type` |
| Payload too large (native adapter)    | `413 Payload Too Large`      |
| Update handling failed                | `500 Internal Server Error`  |
