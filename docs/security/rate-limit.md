# Rate Limiter

Built-in anti-spam middleware that enforces Telegram-aligned rate limits.

## Quick Start

```typescript
import { Bot, rateLimit } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

// Use default limits (1 msg/sec private, 20 msg/min group)
bot.use(rateLimit());
```

## Custom Configuration

```typescript
bot.use(rateLimit({
    windowMs: 5000,    // 5-second window
    limit: 2,          // Max 2 messages per window
    onLimitExceeded: async (ctx) => {
        await ctx.reply('Too many requests. Please wait.');
    }
}));
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `windowMs` | `number` | Auto | Time window in ms |
| `limit` | `number` | Auto | Max actions per window |
| `onLimitExceeded` | `function` | Silent drop | Handler when limit exceeded |

## Default Behavior

When no options are provided, the rate limiter automatically applies Telegram's official limits:
- **Private chats**: 1 message per second
- **Group chats**: 20 messages per minute

Excess requests are silently dropped (not forwarded to handlers). No error is thrown.
