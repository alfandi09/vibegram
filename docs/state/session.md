# Sessions

The `session()` middleware adds `ctx.session` to every update with a resolvable
chat/user key. It is designed for small per-user state such as preferences,
wizard progress, or temporary form data.

## Quick Start

```ts
import { Bot, session } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(session());

bot.command('count', async ctx => {
    ctx.session.count = (ctx.session.count ?? 0) + 1;
    await ctx.reply(`Count: ${ctx.session.count}`);
});
```

Session state is loaded before downstream middleware runs and saved after
`next()` completes.

## Typed Sessions

```ts
type MySession = {
    count: number;
    locale?: string;
};

bot.use(
    session<MySession>({
        initial: () => ({ count: 0 }),
    })
);

bot.command('lang', ctx => {
    ctx.session.locale = 'id';
});
```

Use `initial()` to avoid defensive checks in every handler.

## Session Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `store` | `SessionStore` | `new MemorySessionStore()` | Storage adapter for session data. |
| `getSessionKey` | `(ctx) => string \| undefined` | `${chatId}:${fromId}` | Generates the storage key. |
| `initial` | `() => S` | `{}` | Creates a new session when no record exists. |

If `getSessionKey()` returns `undefined`, the update continues without
`ctx.session` persistence.

## Concurrency Safety

The middleware serializes load-handler-save cycles per session key. Two updates
for the same user do not save over each other from the same starting state.
Different session keys can still run concurrently.

## MemorySessionStore

```ts
import { MemorySessionStore, session } from 'vibegram';

bot.use(
    session({
        store: new MemorySessionStore(
            24 * 60 * 60 * 1000, // ttlMs
            10_000, // maxEntries
            60_000 // cleanupIntervalMs
        ),
    })
);
```

The built-in store is volatile. It is useful for development, single-process
bots, and short-lived state. It expires records by TTL and evicts the
least-recently-used entry when `maxEntries` is reached.

## Redis Adapter

Use an external store for production bots that run on multiple workers or need
state to survive restarts.

```ts
const redisStore = {
    async get(key: string) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : undefined;
    },
    async set(key: string, value: unknown) {
        await redis.set(key, JSON.stringify(value), { EX: 60 * 60 * 24 });
    },
    async delete(key: string) {
        await redis.del(key);
    },
};

bot.use(session({ store: redisStore }));
```

## Clearing Sessions

Assign `null` or `undefined` to `ctx.session` to delete the stored session after
the handler finishes.

```ts
bot.command('reset', async ctx => {
    ctx.session = null;
    await ctx.reply('Session cleared.');
});
```

## Custom Session Keys

```ts
bot.use(
    session({
        getSessionKey: ctx => {
            if (!ctx.chat) return undefined;
            return `chat:${ctx.chat.id}`;
        },
    })
);
```

Use chat-level keys for shared group state and chat+user keys for private user
state.

## Custom Storage Adapters

```ts
import type { SessionStore } from 'vibegram';

class DatabaseSessionStore implements SessionStore {
    async get(key: string) {
        return db.session.findUnique({ where: { key } });
    }

    async set(key: string, value: unknown) {
        await db.session.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
    }

    async delete(key: string) {
        await db.session.delete({ where: { key } });
    }
}
```

Adapters should use parameterized queries, TTL or cleanup policies, and stable
JSON serialization for values.

## Memory Management

For long-running processes, prefer one of these:

- Keep the default `MemorySessionStore` limits for small bots.
- Tune `ttlMs` and `maxEntries` for expected traffic.
- Call `store.close()` during graceful shutdown if you created a
  `MemorySessionStore` manually.
- Use Redis or another external store for horizontally scaled production bots.
