# WebApp Validation

VibeGram validates Telegram Mini App `initData` using HMAC-SHA256. This prevents
forged or tampered payloads from being accepted by your backend.

## How Telegram WebApp Auth Works

1. A user opens a Mini App inside Telegram.
2. The Mini App receives `window.Telegram.WebApp.initData`.
3. Your backend validates the `hash` parameter against the bot token.
4. If validation succeeds, the parsed `user` data can be trusted within the
   configured freshness window.

## Validation via Bot Instance

```ts
const bot = new Bot(process.env.BOT_TOKEN!);

app.post('/api/auth', (req, res) => {
    try {
        const data = bot.validateWebAppData(req.body.initData, {
            maxAgeSeconds: 300,
        });

        res.json({ user: data.user });
    } catch {
        res.status(403).json({ error: 'Invalid initData' });
    }
});
```

## Validation via Static Utility

```ts
import { WebAppUtils } from 'vibegram';

const data = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
    maxAgeSeconds: 300,
});
```

## Express and TypeScript Example

```ts
import express from 'express';
import { WebAppUtils } from 'vibegram';

const app = express();

app.use(express.json({ limit: '64kb' }));

app.post('/api/webapp/auth', (req, res) => {
    const initData = req.body?.initData;
    if (typeof initData !== 'string') {
        return res.status(400).json({ error: 'initData is required' });
    }

    try {
        const data = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
            maxAgeSeconds: 600,
        });

        return res.json({
            user: data.user,
        });
    } catch {
        return res.status(403).json({ error: 'Invalid or expired initData' });
    }
});
```

Use a small JSON body limit for auth endpoints. `initData` is a compact query
string, so large bodies are suspicious.

## Security Details

- Uses `crypto.timingSafeEqual()` for constant-time hash comparison.
- Derives the WebApp secret key from the bot token with Telegram's
  `WebAppData` HMAC scheme.
- Requires a valid `hash` parameter and `auth_date` timestamp.
- Rejects malformed hashes and future `auth_date` values.
- `maxAgeSeconds` limits replay using stale `auth_date` values.
- The bot token must stay on the server and must never be sent to the Mini App.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAgeSeconds` | `number` | `86400` | Maximum accepted age of `auth_date`, in seconds. |

`maxAgeSeconds` must be a positive integer.

## Thrown Errors

```ts
import { WebAppValidationError, WebAppUtils } from 'vibegram';

try {
    WebAppUtils.validate(token, initData);
} catch (error) {
    if (error instanceof WebAppValidationError) {
        console.error(error.message);
    }
}
```

Validation failures throw `WebAppValidationError`. Return a generic 403 response
to clients and keep detailed messages in server-side logs.
