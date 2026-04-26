# Adapter Framework (ID)

<FeatureGrid title="Pilih adapter berdasarkan runtime" description="Semua adapter berbagi validasi secret token, pengecekan payload update, health route, dan respons HTTP yang konsisten.">
  <FeatureCard title="Express dan Koa" description="Gunakan middleware saat Anda sudah mengelola routing dan JSON body parser." href="#express-js" cta="Buka Express" />
  <FeatureCard title="Fastify dan Hono" description="Gunakan plugin atau handler API yang sesuai gaya framework." href="#fastify" cta="Buka Fastify" />
  <FeatureCard title="Native HTTP" description="Hindari overhead framework sambil tetap eksplisit soal body limit dan health check." href="#http-native-node-js" cta="Buka native" />
</FeatureGrid>

<CompatibilityTable />

VibeGram menyediakan adapter webhook kelas satu untuk semua framework Node.js populer. Semua adapter secara otomatis memvalidasi header `X-Telegram-Bot-Api-Secret-Token` dan field `update_id`.

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
    await bot.setWebhook(`https://domain.anda.com/webhook`, {
        secret_token: process.env.WEBHOOK_SECRET,
    });
    console.log('Server webhook aktif di port 3000');
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

Kompatibel dengan Cloudflare Workers, Bun, Deno, dan Node.js:

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

## HTTP Native Node.js

Tanpa framework:

```typescript
import http from 'http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    })
).listen(3000);
```

## Opsi Adapter

| Opsi               | Tipe     | Deskripsi                                                         |
| ------------------ | -------- | ----------------------------------------------------------------- |
| `secretToken`      | `string` | Token validasi header Telegram                                    |
| `path`             | `string` | Path route (khusus Fastify). Default: `'/webhook'`                |
| `healthPath`       | `string` | Path GET opsional yang mengembalikan `200 OK` tanpa proses update |
| `maxBodySizeBytes` | `number` | Batas ukuran body mentah untuk adapter native. Default: `1000000` |

## Kode Respons

| Kondisi                                      | Status HTTP                  |
| -------------------------------------------- | ---------------------------- |
| Update valid diproses                        | `200 OK`                     |
| Route health check dipanggil                 | `200 OK`                     |
| Secret token tidak cocok                     | `403 Forbidden`              |
| Body tidak memiliki `update_id`              | `400 Bad Request`            |
| Content type tidak didukung (adapter native) | `415 Unsupported Media Type` |
| Payload terlalu besar (adapter native)       | `413 Payload Too Large`      |
| Pemrosesan update gagal                      | `500 Internal Server Error`  |

::: tip Secret Token
Selalu gunakan secret token untuk memastikan request berasal dari Telegram, bukan dari sumber lain.
:::
