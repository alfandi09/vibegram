# Webhook Security

When using webhooks, VibeGram supports Telegram's `secret_token` verification to prevent unauthorized requests.

## Setup

```typescript
import express from 'express';
import { Bot } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
const WEBHOOK_SECRET = 'my-secure-random-secret';

const app = express();
app.use(express.json());

// The callback validates X-Telegram-Bot-Api-Secret-Token header
app.post('/webhook', bot.webhookCallback(WEBHOOK_SECRET));

app.listen(3000);
```

## How It Works

1. When setting the webhook, include `secret_token` in the API call
2. Telegram includes this token in the `X-Telegram-Bot-Api-Secret-Token` header
3. `webhookCallback()` verifies the header matches your secret
4. Requests with invalid or missing tokens receive `403 Forbidden`

## Deployment Checklist

1. Always terminate TLS in front of your webhook endpoint.
2. Set a random `secret_token` when calling `setWebhook`.
3. Restrict webhook routes to `POST` only.
4. Use JSON body parsing only on the webhook route.
5. Keep your bot token and webhook secret outside source control.

## Adapter Hardening Notes

- Native HTTP adapter rejects non-JSON requests with `415 Unsupported Media Type`.
- Native HTTP adapter rejects oversized bodies with `413 Payload Too Large`.
- All adapters return `500 Internal Server Error` when update processing fails.
- Invalid or malformed update payloads return `400 Bad Request`.

## Register the Webhook

```typescript
await bot.callApi('setWebhook', {
    url: 'https://your-domain.com/webhook',
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
});
```

## Without Secret Token

If you don't need secret token validation:

```typescript
app.post('/webhook', bot.webhookCallback());
```

::: warning
Without a secret token, any client that knows your webhook URL can send fake updates. Always use a secret token in production.
:::

::: tip
For native Node.js deployments, set `maxBodySizeBytes` explicitly if your platform
requires a tighter body limit than the default 1 MB.
:::
