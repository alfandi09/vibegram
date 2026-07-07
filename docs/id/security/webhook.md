# Keamanan Webhook

<SecurityNote title="Aturan webhook produksi" variant="warning">
Setiap webhook produksi harus memakai HTTPS, memvalidasi secret token Telegram,
menetapkan body limit secara eksplisit, dan menyediakan health route ringan.
</SecurityNote>

<FeatureGrid title="Jalur hardening webhook" description="Mulai dari launch native, lalu gunakan adapter framework jika Anda sudah punya server HTTP sendiri.">
  <FeatureCard title="Launch native" description="Biarkan VibeGram mengelola lifecycle server HTTP." href="#launch-webhook-native" cta="Buka native" />
  <FeatureCard title="Adapter framework" description="Mount handler webhook aman di Express, Fastify, Hono, Koa, atau native HTTP." href="#adapter-framework" cta="Buka adapter" />
  <FeatureCard title="Body limit" description="Tolak payload terlalu besar sebelum parsing JSON mencapai handler." href="#batas-ukuran-body" cta="Buka limit" />
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

await bot.setWebhook('https://domain-anda.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000);
```

## Cara Kerja

1. Anda mendaftarkan webhook ke Telegram dengan `secret_token`.
2. Telegram mengirim value itu di header `X-Telegram-Bot-Api-Secret-Token`.
3. VibeGram memvalidasi header sebelum memproses update.
4. Token yang salah atau hilang mendapat `403 Forbidden`.
5. Body update yang malformed mendapat `400 Bad Request`.

## Launch Webhook Native

Untuk deployment standalone, `bot.launch({ webhook })` bisa membuat HTTP server,
mendaftarkan webhook, dan shutdown dengan graceful:

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

`healthPath` mengembalikan `200 OK` tanpa validasi secret token Telegram dan tanpa
memproses body update.

## Adapter Framework

Semua adapter webhook mendukung bentuk `secretToken` dan `healthPath` yang sama:

| Adapter | Import | Catatan |
| --- | --- | --- |
| Express | `createExpressMiddleware` | Mount body parser hanya di route webhook |
| Fastify | `createFastifyPlugin` | Gunakan `bodyLimit` Fastify untuk batas payload |
| Hono | `createHonoHandler` | Pasangkan dengan limit body runtime/platform |
| Koa | `createKoaMiddleware` | Gunakan `koaBody({ jsonLimit: '1mb' })` |
| Native HTTP | `createNativeHandler` | Memakai `maxBodySizeBytes` langsung |

## Batas Ukuran Body

Update Telegram biasanya kecil. Jaga limit cukup ketat untuk melindungi parser dan
infrastruktur:

| Adapter | Tempat mengatur limit |
| --- | --- |
| Native `bot.launch({ webhook })` / `createNativeHandler()` | `maxBodySizeBytes`, default 1 MB |
| Express | `express.json({ limit: '1mb' })` |
| Fastify | `Fastify({ bodyLimit: 1_000_000 })` |
| Hono | Limit body dari runtime/platform |
| Koa | `koaBody({ jsonLimit: '1mb' })` |

Jangan mount body parser unlimited secara global sebelum validasi secret webhook.

## Mendaftarkan dan Menghapus Webhook

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

## Checklist Deployment

1. Terminate TLS di depan endpoint webhook.
2. Set `secret_token` acak dan simpan di environment variable.
3. Terima `POST` saja di route webhook.
4. Mount JSON parser hanya di route webhook dengan size limit.
5. Expose health endpoint ringan untuk platform probe.
6. Jangan log bot token, webhook secret, atau raw request header.

## Tanpa Secret Token

```typescript
app.post('/webhook', bot.webhookCallback());
```

::: warning
Tanpa secret token, client mana pun yang mengetahui URL webhook bisa mengirim update palsu.
Selalu gunakan secret token di produksi.
:::
