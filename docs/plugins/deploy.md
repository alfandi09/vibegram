# Deploy

`@vibegram/deploy` packages webhook deployment primitives for production bots: native HTTP launch, Express/Fastify/Hono presets, health/readiness endpoints, env validation, reverse-proxy-safe webhook URLs, and graceful shutdown.

Use it when the bot runs on a VPS, container, or platform that expects liveness and readiness probes.

## Official Telegram Mapping

This plugin maps directly to Telegram webhook behavior:

- `setWebhook` registers the public HTTPS URL that Telegram calls.
- `deleteWebhook` can remove the webhook on shutdown.
- Telegram sends updates as `Update` JSON objects via `POST`.
- `secretToken` is sent by Telegram in `X-Telegram-Bot-Api-Secret-Token`.

References: [setWebhook](https://core.telegram.org/bots/api#setwebhook), [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook), [getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo), and [Update](https://core.telegram.org/bots/api#update).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/deploy
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/deploy": "file:../vibegram/plugins/deploy"
  }
}
```

## Native Webhook Server

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

`deployWebhook()` starts the server first, then calls Telegram `setWebhook`. Readiness changes to `READY` only after registration succeeds.

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

`readWebhookEnv()` validates `WEBHOOK_URL`, `PORT`, and the optional Telegram secret token format.

## Reverse Proxy Paths

Use `WEBHOOK_URL` for the public URL Telegram can reach, not the internal container URL.

```typescript
import { buildWebhookUrl } from '@vibegram/deploy';

buildWebhookUrl('https://bot.example.com', '/telegram/webhook');
// https://bot.example.com/telegram/webhook

buildWebhookUrl('https://bot.example.com/bots/vibegram', '/webhook');
// https://bot.example.com/bots/vibegram/webhook
```

This is useful when Nginx, Caddy, Cloudflare Tunnel, or a platform router owns the public path.

## Express Preset

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

Fastify presets expose `register(app)`. Hono presets expose `handle(request)` for Fetch-style runtimes.

## Docker Recipe

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

## systemd Recipe

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

## GitHub Pages Note

GitHub Pages can host the VibeGram documentation site, but it cannot run a Node.js webhook bot. Use a server, container platform, or serverless runtime for `@vibegram/deploy`; keep GitHub Pages for static docs only.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `adapter` | `'native' \| 'express' \| 'fastify' \| 'hono'` | `'native'` | Deployment target |
| `webhookUrl` | `string` | required | Public HTTPS base URL |
| `port` | `number` | `3000` | Native server port |
| `host` | `string` | `'0.0.0.0'` | Native server host |
| `path` | `string` | `'/webhook'` | Webhook route |
| `healthPath` | `string` | `'/healthz'` | Liveness endpoint |
| `readinessPath` | `string` | `'/readyz'` | Readiness endpoint |
| `secretToken` | `string` | none | Telegram webhook secret header |
| `maxBodySizeBytes` | `number` | `1048576` | Max webhook payload size |
| `webhookOptions` | `object` | `{}` | Extra `setWebhook` options |
| `registerWebhook` | `boolean` | `true` | Calls `setWebhook` on startup |
| `deleteWebhookOnStop` | `boolean` | `false` | Calls `deleteWebhook` from `stop()` |
| `dropPendingUpdatesOnStop` | `boolean` | `false` | Passed to `deleteWebhook` |
| `allowInsecureWebhookUrl` | `boolean` | `false` | Allows HTTP for local/self-managed Bot API setups |
| `signals` | `NodeJS.Signals[] \| false` | `['SIGINT', 'SIGTERM']` | Signals wired to graceful stop |

## TypeScript API

Exports include `deployWebhook()`, `createWebhookPreset()`, `readWebhookEnv()`, `buildWebhookUrl()`, `DeployConfigError`, `DeployWebhookOptions`, `DeployWebhookHandle`, and `WebhookPreset`.

The bot must expose `handleUpdate(update)`. Automatic registration also requires `setWebhook(url, extra)` or `client.callApi(method, data)`.

## Failure Modes

- `DeployConfigError` is thrown for invalid env, path, port, URL, body size, or secret token.
- Invalid webhook secret headers return `403`.
- Oversized payloads return `413`.
- Malformed JSON or invalid `Update` payloads return `400`.
- Readiness returns `503 NOT_READY` while starting or stopping.

## Security Notes

Use HTTPS for public webhooks, keep tokens in environment variables or a secret manager, and avoid logging raw request headers. A private path is useful, but `secretToken` is the verification control.

## Validation

The plugin is covered by tests for env validation, webhook registration, health/readiness, secret-token rejection, update routing, framework presets, and graceful shutdown.

```bash
npm run plugins:validate
npm run docs:build
```
