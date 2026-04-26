# Keamanan Webhook

Webhook adalah cara yang lebih efisien dibandingkan polling untuk lingkungan produksi — Telegram mengirim update langsung ke server Anda alih-alih server Anda yang mengambilnya.

## Cara Kerja Webhook

```
Telegram → HTTPS POST → Server Anda → Bot Handler
```

## Launch Webhook Native

Untuk deployment standalone, `bot.launch({ webhook })` bisa membuat HTTP server native, mendaftarkan webhook ke Telegram, dan ikut berhenti saat `bot.stop()` atau process signal berjalan:

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

`healthPath` mengembalikan `200 OK` untuk uptime check tanpa validasi secret token Telegram dan tanpa memproses body update.

## Health Check Adapter

Untuk adapter framework, gunakan opsi `healthPath`. Pada framework yang perlu route terpisah seperti Express, mount middleware yang sama pada route webhook dan route health:

```typescript
import { createExpressMiddleware } from 'vibegram';

const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);
```

## Adapter Framework

VibeGram menyediakan adapter untuk 5 framework populer:

### Express.js

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

// Daftarkan webhook
await bot.setWebhook(`https://domain.anda.com/webhook`, {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000);
```

### Fastify

```typescript
import Fastify from 'fastify';
import { Bot, createFastifyPlugin } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const fastify = Fastify();

await fastify.register(
    createFastifyPlugin(bot, {
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    })
);

await fastify.listen({ port: 3000 });
```

### Hono

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

### Koa

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import koaBody from 'koa-body';
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

### HTTP Native Node.js

Tanpa framework, langsung menggunakan modul `http` bawaan Node.js:

```typescript
import http from 'http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const server = http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    })
);

server.listen(3000, () => {
    console.log('Webhook server aktif di port 3000');
});
```

## Secret Token

Semua adapter mendukung `X-Telegram-Bot-Api-Secret-Token` untuk memverifikasi bahwa request berasal dari Telegram:

- Semua adapter mengembalikan **HTTP 403** jika token tidak cocok
- Semua adapter mengembalikan **HTTP 400** jika body tidak memiliki `update_id`
- `healthPath` mengembalikan **HTTP 200** tanpa validasi token dan tanpa memanggil `bot.handleUpdate()`

```typescript
// Daftarkan webhook dengan secret token
await bot.setWebhook('https://domain.anda.com/webhook', {
    secret_token: 'token-rahasia-saya', // kirim ke Telegram
});

// Adapter akan memvalidasi header secara otomatis
app.post(
    '/webhook',
    createExpressMiddleware(bot, {
        secretToken: 'token-rahasia-saya', // validasi header
    })
);
```

## Variabel Lingkungan

```bash
# .env
BOT_TOKEN=1234567890:ABCDefGHIjklMNOpqrSTUvwxYZ
WEBHOOK_URL=https://domain.anda.com
WEBHOOK_SECRET=token-rahasia-yang-aman-dan-panjang
```

## Mendaftarkan & Menghapus Webhook

```typescript
// Daftarkan webhook
await bot.setWebhook(`${process.env.WEBHOOK_URL}/webhook`, {
    secret_token: process.env.WEBHOOK_SECRET,
    max_connections: 100, // maksimal koneksi paralel
    allowed_updates: ['message', 'callback_query'], // filter update
});

// Cek info webhook aktif
const info = await bot.getWebhookInfo();
console.log(info); // { url, pending_update_count, ... }

// Hapus webhook (beralih ke polling)
await bot.deleteWebhook({ drop_pending_updates: true });
```

## Tips Produksi

::: tip Gunakan HTTPS
Telegram hanya menerima webhook dengan HTTPS. Gunakan sertifikat SSL dari Let's Encrypt atau Cloudflare Tunnel untuk pengembangan.
:::

::: tip Drop Pending Updates
Saat restart server, update yang menumpuk bisa diproses sekaligus. Gunakan `drop_pending_updates: true` saat re-register webhook untuk menghindari lonjakan.
:::

::: tip Health Check
Gunakan `healthPath` seperti `/healthz` untuk load balancer dan platform probe. Endpoint ini ringan dan tidak memproses update Telegram.
:::
