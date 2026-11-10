# Durable Conversations

`DurableConversation` is a restart-safe version of [`Conversation`](/state/conversations).
Active conversations live in a store (memory, Redis, a database, a KV namespace), so
they survive deploys, work across multiple bot instances, and run on serverless or
edge platforms where no process stays alive between updates.

```typescript
import { Bot, DurableConversation } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const conversations = new DurableConversation({ store: redisStore, timeout: 30 * 60_000 });

conversations.define('signup', async (ctx, conv) => {
    await ctx.reply('What is your name?');
    const name = await conv.waitForText();

    await ctx.reply('How old are you?');
    const age = await conv.waitForText({
        validate: c => /^\d+$/.test(c.message?.text ?? ''),
        validationError: 'Please send a number.',
    });

    const userId = await conv.external(() => db.users.insert({ name, age: Number(age) }));
    await ctx.reply(`Welcome, ${name}! (#${userId})`);
});

bot.use(conversations.middleware());
bot.command('signup', ctx => conversations.enter('signup', ctx));
```

## How it works

Instead of keeping a paused function in memory, a durable conversation stores the
updates it received and the result of every Bot API call and `conv.external()` call.
When the next update arrives, the handler **replays from the start**: recorded updates
are fed to `wait*()` instantly and recorded API results are returned without calling
Telegram again, so no message is sent twice. Execution then continues live until the
next `wait*()`.

## The determinism rule

Because the handler re-runs, it must take the same path every time. Wrap anything
that can differ between runs in `conv.external()`; its result is recorded once and
replayed afterwards:

```typescript
// ✅ recorded once
const now = await conv.external(() => Date.now());
const order = await conv.external(() => api.createOrder(cart));

// ❌ re-runs on every update and may differ
const now = Date.now();
await db.orders.insert(cart);
```

If a replay takes a different path than the recording, the conversation is dropped and
`ConversationReplayError` is thrown (it reaches `bot.catch()`).

## API

| Method | Description |
| --- | --- |
| `define(name, handler)` | Register a conversation. |
| `enter(name, ctx)` | Start a conversation for the current user and chat (replaces an active one). |
| `leave(ctx)` | Cancel the active conversation. |
| `isActive(ctx)` | Whether an unexpired conversation exists. |
| `middleware()` | Routes updates into active conversations. Register it before your commands. |

Inside the handler, `conv` provides `wait()`, `waitForText()`, `waitForCallbackQuery()`,
`waitForPhoto()`, `waitForContact()`, `waitForLocation()` (all accept `validate` and
`validationError`), and `external(fn)`.

| Option | Default | Description |
| --- | --- | --- |
| `store` | `MemoryConversationStore` | Any `{ get, set, delete }` adapter. Records must be JSON-serializable. |
| `timeout` | 24 hours | Inactivity timeout; expired conversations are dropped and the update falls through. |
| `getKey` | `${chat.id}:${from.id}` | Conversation key. |

## Writing a store

```typescript
import type { ConversationStore } from 'vibegram';

const redisStore: ConversationStore = {
    async get(key) {
        const raw = await redis.get(`conv:${key}`);
        return raw ? JSON.parse(raw) : undefined;
    },
    async set(key, record) {
        await redis.set(`conv:${key}`, JSON.stringify(record), 'PX', 30 * 60_000);
    },
    async delete(key) {
        await redis.del(`conv:${key}`);
    },
};
```

## Limits

- While a conversation waits, **every** update from that user in that chat is consumed
  (same as `Conversation`). Provide an in-conversation exit, e.g. treat `/cancel` text as
  a reply and `return`.
- `ctx` inside the handler is a plain `Context`: properties added by other middleware
  (such as `ctx.session`) are not available there. Read such state via `conv.external()`.
- The record grows with every update, so prefer conversations of tens of steps, not
  thousands.
