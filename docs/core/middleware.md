# Middleware Pipeline

VibeGram uses a Koa.js-inspired **onion model** for middleware composition. Each middleware receives a `ctx` object and a `next` function. This architecture gives you precise control over request lifecycle — before and after any downstream handler.

## How It Works

When an update arrives, VibeGram passes it through your registered middleware chain in registration order. Each middleware can run code _before_ calling `next()` (downstream phase) and _after_ `next()` resolves (upstream phase).

```
Incoming Update
      │
      ▼
┌─────────────┐
│   Logger    │ ← runs first (before)
└──────┬──────┘
       │ next()
       ▼
┌─────────────┐
│  RateLimit  │ ← checks rate before handler
└──────┬──────┘
       │ next()
       ▼
┌─────────────┐
│   Session   │ ← loads session data
└──────┬──────┘
       │ next()
       ▼
┌─────────────┐
│   Handler   │ ← your command/listener
└──────┬──────┘
       │ (resolves)
       ▼
Session saves → RateLimit records → Logger logs timing
```

## Basic Middleware

```typescript
bot.use(async (ctx, next) => {
    console.log(`[${new Date().toISOString()}] Update: ${ctx.update.update_id}`);
    await next(); // pass control downstream
    console.log('Handler completed');
});
```

## Execution Order

Middleware executes in registration order (downstream), then unwinds in reverse (upstream):

```
Request  → MW1.before → MW2.before → MW3.before → Handler
Response ← MW1.after  ← MW2.after  ← MW3.after  ←
```

## Composing Middleware

Use `Composer` to group related middleware into reusable units:

```typescript
import { Composer } from 'vibegram';

const adminGuard = new Composer();

adminGuard.use(async (ctx, next) => {
    const adminIds = [123456, 789012];
    if (adminIds.includes(ctx.from?.id ?? 0)) {
        return next();
    }
    await ctx.reply('Access denied.');
});

adminGuard.command('secret', ctx => ctx.reply('Admin-only content.'));

bot.use(adminGuard.middleware());
```

## Handling Errors in Middleware

Errors thrown inside middleware bubble up through the chain. Use `bot.catch()` to catch them globally:

```typescript
bot.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error('Middleware caught error:', err);
        await ctx.reply('Something went wrong.');
    }
});

// Global catch-all (fallback for unhandled errors)
bot.catch(async (error, ctx) => {
    console.error('Unhandled error:', error);
    await ctx.reply('Unexpected error. Please try again.');
});
```

## Built-in Middleware

| Middleware | Import | Purpose |
|---|---|---|
| `session()` | `import { session }` | User state persistence |
| `rateLimit()` | `import { rateLimit }` | Anti-spam throttling |
| `logger()` | `import { logger }` | Request logging with timing |
| `i18n.middleware()` | `import { I18n }` | Internationalization |
| `stage.middleware()` | `import { Stage }` | Scene routing |
| `apiCache()` | `import { apiCache }` | TTL-based API response caching |

## Recommended Registration Order

Order matters. Register middleware that affects all subsequent handlers first:

```typescript
bot.use(logger());          // 1. Observability — log every update
bot.use(rateLimit());       // 2. Protection — reject spam before any processing
bot.use(apiCache());        // 3. Caching — deduplicate identical API calls
bot.use(session());         // 4. State — load session data for handlers
bot.use(stage.middleware()); // 5. Scene routing
// Your handlers go here    // 6. Business logic
```

## Short-circuiting

A middleware can stop the chain by not calling `next()`:

```typescript
bot.use(async (ctx, next) => {
    if (!ctx.from) {
        // Anonymous update — ignore silently
        return;
    }
    return next();
});
```

## Conditional Middleware

Apply middleware only to specific update types using filter combinators:

```typescript
import { and, isMessage, isCommand } from 'vibegram';

// Only apply to text messages that are commands
bot.use(and(isMessage, isCommand), async (ctx, next) => {
    console.log(`Command: ${ctx.command?.command}`);
    return next();
});
```

::: tip
See [Filter Combinators](/core/filters) for the full list of composable predicates.
:::

::: warning
Always `await next()` or `return next()` — not just `next()`. Forgetting `await` is a common source of race conditions in async middleware.
:::
