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
| `windowMs` | `number` | Auto | Time window in ms (1000 private, 60000 group) |
| `limit` | `number` | Auto | Max actions per window (1 private, 20 group) |
| `keyGenerator` | `(ctx) => string \| undefined` | `chatId_fromId` | Custom per-user tracking key |
| `onLimitExceeded` | `(ctx, next) => void` | Silent drop | Handler when limit exceeded |
| `store` | `RateLimitStore` | In-memory | External store for sharing counters across processes |
| `strictMode` | `boolean` | `false` | Block updates with no resolvable key instead of passing through |

## Default Behavior

When no options are provided, the rate limiter automatically applies Telegram's official limits:
- **Private chats**: 1 message per second
- **Group chats**: 20 messages per minute

Excess requests are silently dropped (not forwarded to handlers). No error is thrown.

## Sharing Counters Across Processes

For multi-process or multi-worker deployments, pass an external `store` so the counter is shared (e.g. backed by Redis). The store contract is:

```typescript
interface RateLimitStore {
    get(key: string): Promise<RateLimitRecord | undefined> | RateLimitRecord | undefined;
    set(key: string, value: RateLimitRecord, ttlMs: number): Promise<void> | void;
    delete(key: string): Promise<void> | void;
    // Optional — see below.
    increment?(key: string, windowMs: number, now: number):
        Promise<RateLimitRecord> | RateLimitRecord;
}
```

::: warning Concurrency
A plain `get` → modify → `set` cycle is **not atomic** on a shared async store. Under a burst of simultaneous updates for the same key, two requests can both read the same count and both write back the same value, so the increment is undercounted and the limit is bypassed.

To stay correct under concurrency, implement the optional **`increment()`** method to perform an atomic create-or-increment (e.g. a Redis `INCR` with `EXPIRE`). When present, the middleware uses it instead of the `get`/`set` cycle. The built-in in-memory store is single-threaded and already atomic.
:::

```typescript
// Example: Redis-backed atomic store (pseudocode)
const store: RateLimitStore = {
    get: async (key) => /* ... */,
    set: async (key, value, ttlMs) => /* ... */,
    delete: async (key) => /* ... */,
    increment: async (key, windowMs, now) => {
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, windowMs);
        const pttl = await redis.pttl(key);
        return { count, resetTime: now + Math.max(0, pttl) };
    },
};

bot.use(rateLimit({ store }));
```
