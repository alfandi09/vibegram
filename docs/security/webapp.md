# WebApp Validation

VibeGram validates Telegram Mini App `initData` using HMAC-SHA256. This prevents forged or tampered payloads.

## How Telegram WebApp Auth Works

1. User opens a Mini App inside Telegram
2. The Mini App receives `window.Telegram.WebApp.initData` (a query string)
3. Your backend validates the `hash` parameter against the bot token using HMAC-SHA256
4. If valid, the `user` data can be trusted

## Validation via Bot Instance

```typescript
const bot = new Bot('YOUR_BOT_TOKEN');

// In your Express.js route handler:
app.post('/api/auth', (req, res) => {
    try {
        const userData = bot.validateWebAppData(req.body.initData, {
            maxAgeSeconds: 300 // Reject data older than 5 minutes
        });
        res.json({ user: userData });
    } catch (error) {
        res.status(403).json({ error: 'Invalid initData' });
    }
});
```

## Validation via Static Utility

```typescript
import { WebAppUtils } from 'vibegram';

const userData = WebAppUtils.validate('YOUR_BOT_TOKEN', initData, {
    maxAgeSeconds: 300
});
```

## Security Details

- Uses `crypto.timingSafeEqual()` to prevent timing attacks on hash comparison
- Bot token is private — never exposed in the WebApp client
- `maxAgeSeconds` prevents replay attacks using stale `auth_date` values

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAgeSeconds` | `number` | `undefined` | Max age of initData in seconds |
