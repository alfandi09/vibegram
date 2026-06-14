# Sessions

Sessions persist user data across updates. They are stored per-user, per-chat and remain in memory until evicted.

## Quick Start

```typescript
import { Bot, session } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.use(session({
    initial: () => ({ counter: 0 })
}));

bot.on('message', async (ctx) => {
    ctx.session.counter++;
    await ctx.reply(`Messages sent: ${ctx.session.counter}`);
});
```

## Typed Sessions

Use TypeScript generics for IDE autocompletion and type safety:

```typescript
interface MySession {
    counter: number;
    cart: string[];
    locale: string;
}

bot.use(session<MySession>({
    initial: () => ({ counter: 0, cart: [], locale: 'en' })
}));

// ctx.session is now typed as MySession
bot.on('message', async (ctx) => {
    ctx.session.cart.push('item');  // ✅ autocomplete works
});
```

## Session Options

| Option | Type | Description |
|--------|------|-------------|
| `store` | `SessionStore` | Custom storage adapter |
| `getSessionKey` | `(ctx) => string` | Custom key generator (default: `chatId:userId`) |
| `initial` | `() => S` | Factory for default session state |

## Custom Storage Adapters

Implement the `SessionStore` interface for external databases:

```typescript
import { SessionStore } from 'vibegram';

class RedisAdapter implements SessionStore {
    async get(key: string) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : undefined;
    }

    async set(key: string, value: any) {
        await redis.set(key, JSON.stringify(value), 'EX', 86400);
    }

    async delete(key: string) {
        await redis.del(key);
    }
}

bot.use(session({
    store: new RedisAdapter(),
    initial: () => ({ counter: 0 })
}));
```

## Concurrency Safety

The `session()` middleware serializes the load → handler → save cycle **per session key**. Concurrent updates for the same `chatId:userId` are processed one at a time, so two rapid messages from the same user can't read the same starting state and overwrite each other's changes (last-writer-wins). Updates for *different* keys still run in parallel.

## Memory Management

The built-in `MemorySessionStore` enforces a hard cap of **10,000 entries** (configurable) with true LRU eviction — reading a session refreshes its recency, so the least-recently-used entry is evicted first:

```typescript
import { MemorySessionStore } from 'vibegram';

// Constructor: (ttlMs, maxEntries, cleanupIntervalMs)
const store = new MemorySessionStore(86_400_000, 5000); // 24h TTL, max 5,000 sessions
bot.use(session({ store }));
```

::: warning
The default in-memory store is volatile — data is lost on restart. Use a persistent adapter (Redis, MongoDB) for production deployments.
:::
