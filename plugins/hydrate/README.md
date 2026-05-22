# @vibegram/hydrate

Hydrated Telegram object helpers for VibeGram bots.

This package adds non-enumerable helper methods to message, callback query, chat, user, and Telegram API message results so handlers can call methods directly on the object that already contains the right IDs.

## Install

```bash
npm install vibegram @vibegram/hydrate
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/hydrate": "file:../vibegram/plugins/hydrate"
  }
}
```

## Usage

```typescript
import { Bot, type Context } from 'vibegram';
import { hydrate, type HydrateFlavor } from '@vibegram/hydrate';

type MyContext = HydrateFlavor<Context>;

const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(hydrate());

bot.on('message:text', async ctx => {
    const status = await ctx.reply('Processing...');
    await status.editText('Done');
    await status.delete();
});

bot.action('save', async ctx => {
    await ctx.update.callback_query?.answer('Saved');
    await ctx.update.callback_query?.editMessageText('Saved successfully');
});
```

## Helpers

| Object | Helpers |
| --- | --- |
| Message | `reply()`, `editText()`, `delete()`, `pin()`, `unpin()` |
| Callback query | `answer()`, `editMessageText()` |
| Chat | `sendMessage()`, `get()` |
| User | `getProfilePhotos()` |

## Notes

- Helpers are added with `Object.defineProperty(..., enumerable: false)`.
- JSON serialization stays clean.
- Telegram permission and time-window rules still apply.
- API results are hydrated while the middleware is active for the current update.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
