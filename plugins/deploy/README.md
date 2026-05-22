# @vibegram/deploy

Webhook deployment helpers for VibeGram bots: native HTTP server launch, framework presets, health/readiness endpoints, environment validation, reverse-proxy URL helpers, and graceful shutdown.

Use this package when a bot is deployed behind a VPS, container, reverse proxy, or platform that expects health checks.

## Official Telegram Mapping

`@vibegram/deploy` registers Telegram webhooks with `setWebhook` and optionally removes them with `deleteWebhook` on shutdown.

Telegram sends webhook updates as HTTPS `POST` requests. When `secretToken` is configured, Telegram includes it in the `X-Telegram-Bot-Api-Secret-Token` header. The plugin validates that header before passing the update to `bot.handleUpdate(update)`.

References:

- [setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook)
- [getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo)
- [Update](https://core.telegram.org/bots/api#update)

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

bot.on('message:text', ctx => ctx.reply('Hello from webhook mode.'));

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
    dropPendingUpdatesOnStop: false,
});

console.log(`Listening on ${deployment.localUrl}`);
```

Recommended environment:

```bash
TELEGRAM_BOT_TOKEN=123:secret
WEBHOOK_URL=https://bot.example.com
PORT=3000
TELEGRAM_WEBHOOK_SECRET=change-me
WEBHOOK_PATH=/telegram/webhook
HEALTH_PATH=/healthz
READINESS_PATH=/readyz
```

`deployWebhook()` starts the native server, registers the webhook after the server is listening, then marks readiness as `READY`.

## Reverse Proxy URL Helper

`buildWebhookUrl()` appends the webhook path to a public base URL and preserves reverse-proxy base paths:

```typescript
buildWebhookUrl('https://bot.example.com', '/telegram/webhook');
// https://bot.example.com/telegram/webhook

buildWebhookUrl('https://bot.example.com/bots/vibegram', '/webhook');
// https://bot.example.com/bots/vibegram/webhook
```

Use `WEBHOOK_URL` for the public URL that Telegram can reach, not the internal container URL.

## Framework Presets

Use `createWebhookPreset()` when Express, Fastify, or Hono owns the server process.

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

app.listen(Number(process.env.PORT ?? 3000));
```

Fastify presets expose `register(app)`. Hono presets expose a Fetch-style `handle(request)`.

## Docker

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

Mount secrets as environment variables or platform secrets:

```bash
docker run --rm -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  -e WEBHOOK_URL="https://bot.example.com" \
  -e TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET" \
  vibegram-bot
```

Behind Nginx or Caddy, proxy the public path to `http://127.0.0.1:3000`.

## systemd

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

Example `/etc/vibegram-bot.env`:

```bash
NODE_ENV=production
PORT=3000
WEBHOOK_URL=https://bot.example.com
WEBHOOK_PATH=/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=replace-with-a-long-random-token
TELEGRAM_BOT_TOKEN=123:secret
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `adapter` | `'native' \| 'express' \| 'fastify' \| 'hono'` | `'native'` | Deployment target |
| `webhookUrl` | `string` | required | Public HTTPS base URL or URL with a reverse-proxy base path |
| `port` | `number` | `3000` | Native server port; `0` asks Node to pick a free port |
| `host` | `string` | `'0.0.0.0'` | Native server host |
| `path` | `string` | `'/webhook'` | Webhook route path |
| `healthPath` | `string` | `'/healthz'` | Liveness endpoint path |
| `readinessPath` | `string` | `'/readyz'` | Readiness endpoint path |
| `secretToken` | `string` | none | Telegram webhook secret header value |
| `maxBodySizeBytes` | `number` | `1048576` | Maximum webhook JSON payload size |
| `webhookOptions` | `object` | `{}` | Extra Telegram `setWebhook` options such as `allowed_updates` |
| `registerWebhook` | `boolean` | `true` | Whether to call `setWebhook` on startup |
| `deleteWebhookOnStop` | `boolean` | `false` | Whether `stop()` calls `deleteWebhook` |
| `dropPendingUpdatesOnStop` | `boolean` | `false` | Passed to `deleteWebhook` when enabled |
| `allowInsecureWebhookUrl` | `boolean` | `false` | Allows non-HTTPS URLs for local/self-managed Bot API setups |
| `signals` | `NodeJS.Signals[] \| false` | `['SIGINT', 'SIGTERM']` | Signals that trigger graceful stop |

## TypeScript API

Main exports:

- `deployWebhook(bot, options)`
- `createWebhookPreset(bot, options)`
- `readWebhookEnv(env?, names?)`
- `buildWebhookUrl(publicUrl, path?)`
- `DeployConfigError`
- `DeployWebhookOptions`
- `DeployWebhookHandle`
- `WebhookPreset`

The bot object must expose `handleUpdate(update)`. For automatic registration it must also expose either `setWebhook(url, extra)` or `client.callApi(method, data)`.

## Failure Modes

- `DeployConfigError` is thrown for missing env, invalid paths, invalid ports, invalid URLs, and invalid Telegram secret token format.
- Native webhook routes return `403` for invalid secret headers, `413` for oversized payloads, `415` for non-JSON payloads, and `400` for malformed updates.
- Readiness returns `503 NOT_READY` while the native deployment is starting or stopping.
- If webhook registration fails after the native server starts, the server is closed before the error is rethrown.

## Security Notes

- Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in environment variables or a secret manager.
- Use HTTPS for public Telegram webhooks. Telegram does not send webhook updates to plain HTTP public URLs.
- Make webhook paths unguessable enough to reduce noise, but rely on `secretToken` for verification.
- Do not log raw request headers because they can include the webhook secret.

## Validation

The package includes tests for env validation, health/readiness endpoints, webhook registration, secret-token rejection, update routing, framework presets, and graceful shutdown.

```bash
npm run plugins:validate
npm run docs:build
```
