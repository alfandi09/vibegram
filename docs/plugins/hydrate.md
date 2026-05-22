# Hydrate

`@vibegram/hydrate` adds helper methods directly to Telegram objects that already contain the right IDs. Instead of manually passing `chat_id`, `message_id`, or `callback_query_id` every time, you can call methods on messages, callback queries, chats, users, and message results returned by API calls.

## Official Telegram Mapping

Hydrate is a thin developer-experience layer over official Telegram Bot API methods:

| Helper | Bot API method |
| --- | --- |
| `message.reply(text, extra?)` | `sendMessage` |
| `message.editText(text, extra?)` | `editMessageText` |
| `message.delete()` | `deleteMessage` |
| `message.pin(options?)` | `pinChatMessage` |
| `message.unpin(extra?)` | `unpinChatMessage` |
| `callbackQuery.answer(text?, showAlert?, extra?)` | `answerCallbackQuery` |
| `callbackQuery.editMessageText(text, extra?)` | `editMessageText` |
| `chat.sendMessage(text, extra?)` | `sendMessage` |
| `chat.get()` | `getChat` |
| `user.getProfilePhotos(extra?)` | `getUserProfilePhotos` |

Telegram's normal rules still apply. For example, message deletion has Telegram time and permission limits, pinning requires the required admin rights in groups/channels, and callback queries should be answered so Telegram clients stop showing the loading indicator.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/hydrate
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/hydrate": "file:../vibegram/plugins/hydrate"
  }
}
```

## Minimal Usage

```typescript
import { Bot, type Context } from 'vibegram';
import { hydrate, type HydrateFlavor } from '@vibegram/hydrate';

type MyContext = HydrateFlavor<Context>;

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot<MyContext>(token);

bot.use(hydrate());

bot.on('message:text', async ctx => {
    const status = await ctx.reply('Processing...');
    await status.editText('Done');
    await status.delete();
});

await bot.launch();
```

## Before and After

Without hydrate:

```typescript
bot.on('message:text', async ctx => {
    const status = await ctx.reply('Processing...');

    await ctx.client.callApi('editMessageText', {
        chat_id: ctx.chat?.id,
        message_id: status.message_id,
        text: 'Done',
    });

    await ctx.client.callApi('deleteMessage', {
        chat_id: status.chat.id,
        message_id: status.message_id,
    });
});
```

With hydrate:

```typescript
bot.on('message:text', async ctx => {
    const status = await ctx.reply('Processing...');

    await status.editText('Done');
    await status.delete();
});
```

## Incoming Messages

Incoming messages are hydrated during the current update:

```typescript
bot.on('message:text', async ctx => {
    await ctx.message?.reply('Received');
    await ctx.message?.pin(true);
});
```

`message.reply()` sends a message to the same chat and preserves `business_connection_id` and `message_thread_id` when present. It does not quote the message automatically. Use Telegram `reply_parameters` when you want a quoted reply:

```typescript
await ctx.message?.reply('Quoted', {
    reply_parameters: { message_id: ctx.message.message_id },
});
```

## Callback Queries

Callback queries get helpers for the most common button flow:

```typescript
bot.action('save', async ctx => {
    const query = ctx.update.callback_query;
    if (!query) return;

    await query.answer('Saved');
    await query.editMessageText('Saved successfully');
});
```

If `inline_message_id` is present, `editMessageText()` uses it. Otherwise it uses the callback query message's `chat.id` and `message_id`.

## Chat and User Helpers

Hydrate also adds small safe helpers to nested objects:

```typescript
await ctx.message?.chat.sendMessage('Hello from this chat');
const chat = await ctx.message?.chat.get();
const photos = await ctx.from?.getProfilePhotos({ limit: 3 });
```

## API Result Hydration

By default, message-like objects returned from `ctx.client.callApi()` while the middleware is active are hydrated:

```typescript
bot.on('message:text', async ctx => {
    const sent = await ctx.client.callApi('sendMessage', {
        chat_id: ctx.chat?.id,
        text: 'Working...',
    });

    await sent.editText('Done');
});
```

If you do not want API result hydration, disable it:

```typescript
bot.use(hydrate({ hydrateApiResults: false }));
```

## Serialization

Helpers are non-enumerable:

```typescript
Object.keys(ctx.message ?? {}); // no helper method names
JSON.stringify(ctx.message); // no helper method names
```

The plugin mutates only objects in the current update and API result objects. It does not patch global prototypes.

## TypeScript

Use `HydrateFlavor` for typed helper access:

```typescript
import type { Context } from 'vibegram';
import type { HydrateFlavor } from '@vibegram/hydrate';

type MyContext = HydrateFlavor<Context>;
```

## Validation

The package includes tests for API result hydration, incoming message helpers, callback query helpers, chat/user wrappers, correct ID mapping, serialization behavior, and type augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
