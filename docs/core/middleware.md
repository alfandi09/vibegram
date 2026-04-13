# Middleware Pipeline

VibeGram uses a Koa.js-inspired onion model for middleware composition. Each middleware receives a `ctx` object and a `next` function.

## Basic Middleware

```typescript
bot.use(async (ctx, next) => {
    console.log('Before handler');
    await next();  // pass control downstream
    console.log('After handler');
});
```

## Execution Order

Middleware executes in registration order (downstream), then unwinds in reverse (upstream):

```
Request → MW1 → MW2 → MW3 → Handler
Response ← MW1 ← MW2 ← MW3 ←
```

## Composing Middleware

```typescript
import { Composer } from 'vibegram';

const adminGuard = new Composer();

adminGuard.use(async (ctx, next) => {
    const adminIds = [123456, 789012];
    if (adminIds.includes(ctx.from?.id || 0)) {
        return next();
    }
    await ctx.reply('Access denied.');
});

adminGuard.command('secret', ctx => ctx.reply('Admin-only content.'));

bot.use(adminGuard.middleware());
```

## Built-in Middleware

| Middleware | Import | Purpose |
|-----------|--------|---------|
| `session()` | `import { session }` | User state persistence |
| `rateLimit()` | `import { rateLimit }` | Anti-spam throttling |
| `logger()` | `import { logger }` | Request logging |
| `i18n.middleware()` | `import { I18n }` | Internationalization |
| `stage.middleware()` | `import { Stage }` | Scene routing |

### Recommended Registration Order

```typescript
bot.use(logger());         // 1. Observability
bot.use(rateLimit());      // 2. Protection
bot.use(session());        // 3. State
bot.use(stage.middleware()); // 4. Scene routing
// Your handlers go here   // 5. Business logic
```
