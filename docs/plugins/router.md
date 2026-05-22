# Router

`@vibegram/router` routes updates to named middleware trees. It is useful when a bot grows beyond a single flat middleware list and you want to split flows by session state, chat type, update type, or another application-specific key.

## Official Telegram Mapping

This plugin does not call Telegram APIs. It reads Telegram update data already delivered to your bot:

- `update` root fields such as `message`, `edited_message`, `channel_post`, `callback_query`, or `inline_query`.
- `chat.type` values from Telegram `Chat`: `private`, `group`, `supergroup`, or `channel`.

The router follows Telegram's update shape, but routing is local middleware behavior. It does not change `allowed_updates`, webhook configuration, or polling behavior.

Reference: [Telegram Bot API Update](https://core.telegram.org/bots/api#update) and [Telegram Bot API Chat](https://core.telegram.org/bots/api#chat).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/router
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/router": "file:../vibegram/plugins/router"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { router } from '@vibegram/router';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(router(ctx => ctx.session?.flow ?? 'main', {
    main: async (ctx, next) => {
        await ctx.reply('Main flow');
        await next();
    },
    checkout: async ctx => {
        await ctx.reply('Checkout flow');
    },
    fallback: async (ctx, next) => {
        await ctx.reply('Unknown flow');
        await next();
    },
}));

await bot.launch();
```

## Session-Based Routing

Use `sessionRouter()` when the route key lives in `ctx.session`:

```typescript
import { session, Composer } from 'vibegram';
import { sessionRouter } from '@vibegram/router';

const main = new Composer();
const checkout = new Composer();
const support = new Composer();

bot.use(session({ initial: () => ({ flow: 'main' }) }));

bot.use(sessionRouter('flow', {
    main,
    checkout,
    support,
    fallback: ctx => ctx.reply('Unknown flow'),
}));
```

Routes can be middleware functions or composer-like objects with `middleware()`.

## Chat Type Routing

Use `chatTypeRouter()` for private/group/channel-specific structure:

```typescript
import { chatTypeRouter } from '@vibegram/router';

bot.use(chatTypeRouter({
    private: privateComposer,
    group: groupComposer,
    supergroup: groupComposer,
    channel: channelComposer,
    fallback: ctx => ctx.reply('Unsupported chat'),
}));
```

Telegram chat types are `private`, `group`, `supergroup`, and `channel`.

## Update Type Routing

Use `updateTypeRouter()` to route by the root update field:

```typescript
import { updateTypeRouter } from '@vibegram/router';

bot.use(updateTypeRouter({
    message: messageComposer,
    callback_query: callbackComposer,
    inline_query: inlineComposer,
    fallback: async (_ctx, next) => next(),
}));
```

`getUpdateType(update)` returns the first root key other than `update_id`.

## Async Resolvers

Resolvers can be async, which is useful for loading small routing state from a custom store:

```typescript
bot.use(router(async ctx => {
    const state = await flowStore.get(String(ctx.from?.id));
    return state?.flow ?? 'main';
}, {
    main,
    checkout,
    fallback: ctx => ctx.reply('Unknown flow'),
}));
```

Keep resolvers fast. Heavy lookups should be cached or moved into a dedicated middleware before routing.

## Middleware Order

Route handlers receive the same `next()` as normal VibeGram middleware:

```typescript
bot.use(router(() => 'main', {
    main: async (ctx, next) => {
        await ctx.reply('Before downstream');
        await next();
        await ctx.reply('After downstream');
    },
}));
```

If a route does not call `next()`, downstream middleware will not run.

## TypeScript

Use literal route keys for type checking:

```typescript
type Flow = 'main' | 'checkout' | 'support';

bot.use(router<Context, Flow>(ctx => ctx.session.flow, {
    main,
    checkout,
    support,
}));
```

## Validation

The package includes tests for custom route keys, session routing, chat/update routing, fallback routing, middleware order, async resolvers, composer-like handlers, update type detection, and typed route keys.

```bash
npm run plugins:validate
npm run docs:build
```
