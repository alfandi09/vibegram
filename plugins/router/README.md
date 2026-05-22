# @vibegram/router

Declarative route-key middleware for VibeGram bots.

Use this package to split large bots into route-specific middleware trees selected by session state, chat type, update type, or any custom resolver.

## Install

```bash
npm install vibegram @vibegram/router
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/router": "file:../vibegram/plugins/router"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { router } from '@vibegram/router';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(router(ctx => ctx.session?.flow ?? 'main', {
    main: mainComposer,
    checkout: checkoutComposer,
    support: supportComposer,
    fallback: ctx => ctx.reply('Unknown flow'),
}));
```

Routes can be plain middleware functions or composer-like objects with `middleware()`.

## Helpers

| Export | Purpose |
| --- | --- |
| `router(resolver, routes, options?)` | Route by any sync or async resolver |
| `sessionRouter(fieldOrResolver, routes, options?)` | Route by `ctx.session` state |
| `chatTypeRouter(routes, options?)` | Route by Telegram chat type |
| `updateTypeRouter(routes, options?)` | Route by Telegram root update type |
| `getUpdateType(update)` | Detect the first root update key other than `update_id` |

## Validation

```bash
npm run typecheck
npm test
npm run build
```
