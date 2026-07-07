# Rate Limiter

The `rateLimit()` middleware protects inbound update handling from floods before
your business logic runs. It is useful for public bots, group bots, and webhook
deployments that need a predictable per-user or per-chat request budget.

## Quick Start

```ts
import { Bot, rateLimit } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(rateLimit());
```

With no options, private chats are limited to 1 update per second and groups to
20 updates per minute.

## Custom Configuration

```ts
bot.use(
    rateLimit({
        windowMs: 10_000,
        limit: 5,
        onLimitExceeded: async ctx => {
            await ctx.reply('Too many requests. Please slow down.');
        },
    })
);
```

`windowMs` and `limit` must be positive integers. Invalid numeric options throw a
`TypeError` during middleware setup so misconfiguration fails fast.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `windowMs` | `number` | Private: `1000`, group: `60000` | Window length in milliseconds. |
| `limit` | `number` | Private: `1`, group: `20` | Maximum updates allowed in one window. |
| `keyGenerator` | `(ctx) => string \| undefined` | Chat + user fallback | Builds the counter key. |
| `onLimitExceeded` | `(ctx, next) => void \| Promise<void>` | Silent drop + warning | Called when the limit is exceeded. |
| `store` | `RateLimitStore` | In-memory store | Shares counters across middleware instances or processes. |
| `strictMode` | `boolean` | `false` | Blocks updates that cannot produce a key. |

## Default Behavior

The default key is derived from the most specific identity available:

1. `chat.id` + `from.id`
2. `chat.id`
3. `from.id`
4. `update.update_id`

If no key can be generated and `strictMode` is disabled, the update is passed to
the next middleware. If `strictMode` is enabled, the update is blocked.

## Limit Handling

Use `onLimitExceeded` when you want to send a user-facing response, log a
structured event, or route the update to another guard.

```ts
bot.use(
    rateLimit({
        onLimitExceeded: async ctx => {
            await ctx.reply('Rate limit reached. Try again in a moment.');
        },
    })
);
```

Keep the handler lightweight. It runs during an abuse path, so avoid expensive
database work there.

## Custom Key Generator

```ts
bot.use(
    rateLimit({
        keyGenerator: ctx => {
            if (!ctx.from) return undefined;
            return `user:${ctx.from.id}`;
        },
        strictMode: true,
    })
);
```

Return `undefined` only when the update should follow the `strictMode`
fallback behavior.

## Sharing Counters Across Processes

For multiple Node.js workers or serverless instances, provide a shared store.
If the store can support it, implement `increment()` atomically to avoid
read-modify-write races under concurrent traffic.

```ts
bot.use(
    rateLimit({
        store: redisBackedRateLimitStore,
    })
);
```

The store contract is:

```ts
interface RateLimitStore {
    get(key: string): RateLimitRecord | Promise<RateLimitRecord | undefined> | undefined;
    set(key: string, value: RateLimitRecord, ttlMs: number): void | Promise<void>;
    delete(key: string): void | Promise<void>;
    increment?(
        key: string,
        windowMs: number,
        now: number
    ): RateLimitRecord | Promise<RateLimitRecord>;
}
```

## Integration with Logger

Place the logger before the rate limiter when you want throttled updates to be
observable. Place the rate limiter first when you want to drop abusive traffic
as early as possible.

```ts
bot.use(logger());
bot.use(rateLimit());
```
