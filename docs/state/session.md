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

## Memory Management

The built-in `MemorySessionStore` enforces a hard cap of **10,000 entries** (configurable) with LRU eviction to prevent memory leaks in production:

```typescript
import { MemorySessionStore } from 'vibegram';

const store = new MemorySessionStore(5000); // max 5,000 sessions
bot.use(session({ store }));
```

::: warning
The default in-memory store is volatile — data is lost on restart. Use a persistent adapter (Redis, MongoDB) for production deployments.
:::
