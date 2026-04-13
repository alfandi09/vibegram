# API Caching

The `apiCache` middleware caches responses from read-only Telegram API methods to reduce redundant network calls.

## Quick Start

```typescript
import { Bot, apiCache } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

// Cache API responses for 5 minutes
bot.use(apiCache({ ttl: 300 }));

bot.command('info', async (ctx) => {
    const chat = await ctx.getChat();    // hits API
    const again = await ctx.getChat();   // returns cached
    await ctx.reply(`Chat: ${chat.title}`);
});
```

## Cached Methods

Only idempotent, read-only API methods are cached:

| Method | Description |
|--------|-------------|
| `getChat` | Chat information |
| `getChatMember` | Member info and status |
| `getChatMemberCount` | Member count |
| `getChatAdministrators` | Admin list |
| `getFile` | File download link |
| `getMe` | Bot information |
| `getMyCommands` | Command list |
| `getStickerSet` | Sticker set data |
| `getUserProfilePhotos` | User photos |

Write methods (`sendMessage`, `editMessage`, `deleteMessage`, etc.) are **never cached**.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `300` | Time-to-live in seconds |
| `store` | `CacheStore` | `MemoryCache` | Storage backend |
| `keyGenerator` | `function` | Auto | Custom cache key function |

## Custom Store

Implement the `CacheStore` interface for Redis or other backends:

```typescript
import { CacheStore } from 'vibegram';

class RedisCache implements CacheStore {
    async get(key: string) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : undefined;
    }
    async set(key: string, value: any, ttlMs: number) {
        await redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    }
    async delete(key: string) { await redis.del(key); }
    async clear() { await redis.flushdb(); }
}

bot.use(apiCache({ ttl: 600, store: new RedisCache() }));
```

## Standalone Cache

Use `cached()` to wrap any async function:

```typescript
import { cached } from 'vibegram';

const fetchUser = cached(
    async (userId: number) => db.users.findById(userId),
    { ttl: 60 }
);

const user = await fetchUser(123); // cached for 60 seconds
```

## Memory Management

The built-in `MemoryCache` enforces a hard cap (default: 10,000 entries) with LRU eviction — same strategy as the session store.

```typescript
import { MemoryCache } from 'vibegram';

const store = new MemoryCache(5000); // max 5,000 entries
bot.use(apiCache({ store }));
```
