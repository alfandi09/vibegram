# Deploy

`@vibegram/deploy` membungkus kebutuhan deployment webhook untuk bot production: native HTTP launch, preset Express/Fastify/Hono, endpoint health/readiness, validasi env, helper URL reverse proxy, dan graceful shutdown.

Gunakan plugin ini saat bot berjalan di VPS, container, atau platform yang membutuhkan liveness dan readiness probe.

## Mapping Resmi Telegram

Plugin ini mengikuti behavior webhook resmi Telegram:

- `setWebhook` mendaftarkan URL HTTPS publik yang akan dipanggil Telegram.
- `deleteWebhook` bisa menghapus webhook saat shutdown.
- Telegram mengirim update sebagai JSON object `Update` melalui `POST`.
- `secretToken` dikirim Telegram lewat header `X-Telegram-Bot-Api-Secret-Token`.

Referensi: [setWebhook](https://core.telegram.org/bots/api#setwebhook), [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook), [getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo), dan [Update](https://core.telegram.org/bots/api#update).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/deploy
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/deploy": "file:../vibegram/plugins/deploy"
  }
}
```

## Server Webhook Native

```typescript
import { Bot } from 'vibegram';
import { deployWebhook, readWebhookEnv } from '@vibegram/deploy';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);
const env = readWebhookEnv();

bot.on('message:text', ctx => ctx.reply('Handled from webhook mode.'));

const deployment = await deployWebhook(bot, {
    adapter: 'native',
    webhookUrl: env.webhookUrl,
    port: env.port,
    secretToken: env.secretToken,
    path: env.path ?? '/telegram/webhook',
    healthPath: env.healthPath ?? '/healthz',
    readinessPath: env.readinessPath ?? '/readyz',
    webhookOptions: {
        allowed_updates: ['message', 'callback_query'],
    },
    deleteWebhookOnStop: true,
});

console.log(`Webhook server listening at ${deployment.localUrl}`);
```

`deployWebhook()` menyalakan server terlebih dahulu, lalu memanggil Telegram `setWebhook`. Readiness menjadi `READY` hanya setelah registrasi sukses.

## Environment

```bash
TELEGRAM_BOT_TOKEN=123:secret
WEBHOOK_URL=https://bot.example.com
PORT=3000
TELEGRAM_WEBHOOK_SECRET=change-me
WEBHOOK_PATH=/telegram/webhook
HEALTH_PATH=/healthz
READINESS_PATH=/readyz
```

`readWebhookEnv()` memvalidasi `WEBHOOK_URL`, `PORT`, dan format secret token Telegram opsional.

## Path Reverse Proxy

Gunakan `WEBHOOK_URL` untuk URL publik yang bisa diakses Telegram, bukan URL internal container.

```typescript
import { buildWebhookUrl } from '@vibegram/deploy';

buildWebhookUrl('https://bot.example.com', '/telegram/webhook');
// https://bot.example.com/telegram/webhook

buildWebhookUrl('https://bot.example.com/bots/vibegram', '/webhook');
// https://bot.example.com/bots/vibegram/webhook
```

Ini berguna saat Nginx, Caddy, Cloudflare Tunnel, atau router platform memegang public path.

## Preset Express

```typescript
import express from 'express';
import { Bot } from 'vibegram';
import { createWebhookPreset } from '@vibegram/deploy';

const app = express();
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

const preset = createWebhookPreset(bot, {
    adapter: 'express',
    webhookUrl: process.env.WEBHOOK_URL!,
    path: '/telegram/webhook',
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
});

app.get(preset.healthPath, preset.healthHandler);
app.get(preset.readinessPath, preset.readinessHandler);
app.post(preset.path, express.json(), preset.webhookHandler);

await bot.setWebhook(preset.webhookUrl, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
});
```

Preset Fastify menyediakan `register(app)`. Preset Hono menyediakan `handle(request)` untuk runtime berbasis Fetch.

## Resep Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```bash
docker run --rm -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  -e WEBHOOK_URL="https://bot.example.com" \
  -e TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET" \
  vibegram-bot
```

## Resep systemd

```ini
[Unit]
Description=VibeGram webhook bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/srv/vibegram-bot
EnvironmentFile=/etc/vibegram-bot.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
User=vibegram
Group=vibegram

[Install]
WantedBy=multi-user.target
```

## Catatan GitHub Pages

GitHub Pages bisa dipakai untuk hosting situs dokumentasi VibeGram, tetapi tidak bisa menjalankan bot webhook Node.js. Gunakan server, platform container, atau runtime serverless untuk `@vibegram/deploy`; GitHub Pages cukup untuk docs statis.

## Options

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `adapter` | `'native' \| 'express' \| 'fastify' \| 'hono'` | `'native'` | Target deployment |
| `webhookUrl` | `string` | wajib | Base URL HTTPS publik |
| `port` | `number` | `3000` | Port server native |
| `host` | `string` | `'0.0.0.0'` | Host server native |
| `path` | `string` | `'/webhook'` | Route webhook |
| `healthPath` | `string` | `'/healthz'` | Endpoint liveness |
| `readinessPath` | `string` | `'/readyz'` | Endpoint readiness |
| `secretToken` | `string` | none | Secret header webhook Telegram |
| `maxBodySizeBytes` | `number` | `1048576` | Ukuran maksimal payload webhook |
| `webhookOptions` | `object` | `{}` | Opsi tambahan `setWebhook` |
| `registerWebhook` | `boolean` | `true` | Memanggil `setWebhook` saat startup |
| `deleteWebhookOnStop` | `boolean` | `false` | Memanggil `deleteWebhook` dari `stop()` |
| `dropPendingUpdatesOnStop` | `boolean` | `false` | Diteruskan ke `deleteWebhook` |
| `allowInsecureWebhookUrl` | `boolean` | `false` | Mengizinkan HTTP untuk local/self-managed Bot API |
| `signals` | `NodeJS.Signals[] \| false` | `['SIGINT', 'SIGTERM']` | Signal yang memicu graceful stop |

## API TypeScript

Export utama: `deployWebhook()`, `createWebhookPreset()`, `readWebhookEnv()`, `buildWebhookUrl()`, `DeployConfigError`, `DeployWebhookOptions`, `DeployWebhookHandle`, dan `WebhookPreset`.

Object bot harus punya `handleUpdate(update)`. Registrasi otomatis juga membutuhkan `setWebhook(url, extra)` atau `client.callApi(method, data)`.

## Failure Mode

- `DeployConfigError` dilempar untuk env, path, port, URL, body size, atau secret token yang invalid.
- Header webhook secret yang salah mengembalikan `403`.
- Payload terlalu besar mengembalikan `413`.
- JSON rusak atau payload bukan `Update` valid mengembalikan `400`.
- Readiness mengembalikan `503 NOT_READY` saat starting atau stopping.

## Catatan Keamanan

Gunakan HTTPS untuk webhook publik, simpan token di environment variable atau secret manager, dan jangan log raw request header. Path privat membantu mengurangi noise, tapi `secretToken` tetap kontrol verifikasi utama.

## Validasi

Plugin ini punya test untuk validasi env, registrasi webhook, health/readiness, penolakan secret token, routing update, preset framework, dan graceful shutdown.

```bash
npm run plugins:validate
npm run docs:build
```
