# Conversations

Conversations model free-form multi-step flows where users can answer with text,
buttons, or media. Use them when the next step depends on runtime input and a
linear wizard would be too rigid.

```ts
import { Bot, Conversation } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const conversations = new Conversation();

bot.use(conversations.middleware());
```

## Quick Start

```ts
conversations.define('profile', async (ctx, conv) => {
    await ctx.reply('What is your name?');
    const name = await conv.waitForText();

    await ctx.reply('Send a profile photo.');
    const photo = await conv.waitForPhoto();

    await ctx.reply(`Saved ${name} with ${photo.length} photo sizes.`);
});

bot.command('profile', ctx => conversations.enter('profile', ctx));
```

When a chat enters a conversation, later updates for the same chat/user are
delivered to the active wait step before normal handlers run.

## Conversation Options

```ts
const conversations = new Conversation({
    defaultTimeout: 5 * 60 * 1000,
});
```

`defaultTimeout` controls how long an idle active conversation can stay in
memory. The default is 5 minutes.

## Wait Methods

| Method | Resolves with | Notes |
| --- | --- | --- |
| `conv.wait()` | `Context` | Raw next update for the same chat/user. |
| `conv.waitForText()` | `string` | Requires a text message. |
| `conv.waitForPhoto()` | `PhotoSize[]` | Requires a photo message. |
| `conv.waitForCallbackQuery()` | `string` | Requires callback query data. |
| `conv.waitForContact()` | `Contact` | Requires a shared contact. |
| `conv.waitForLocation()` | `Location` | Requires a shared location. |
| `conv.waitForAny()` | Discriminated union | Text, callback data, or common media. |

Every wait method accepts `timeout`, `validate`, and `validationError`.

## Mixed Input

```ts
const result = await conv.waitForAny();

if (result.type === 'text') {
    await result.ctx.reply(`Text: ${result.text}`);
}

if (result.type === 'callback') {
    await result.ctx.answerCallbackQuery();
}

if (result.type === 'media') {
    await result.ctx.reply(`Media type: ${result.mediaType}`);
}
```

`waitForAny()` is useful when one step accepts multiple Telegram input types.

## Validation

```ts
const quantity = await conv.waitForText({
    validate: ctx => Number.isInteger(Number(ctx.message?.text)),
    validationError: 'Send a whole number.',
});
```

When validation fails, the update is consumed, `validationError` is sent if
provided, and the conversation keeps waiting.

## Timeouts

```ts
try {
    const email = await conv.waitForText({ timeout: 30_000 });
    await ctx.reply(`Email saved: ${email}`);
} catch (error) {
    await ctx.reply('Timed out. Start again when ready.');
}
```

Use per-step `timeout` for user-facing deadlines. Use `defaultTimeout` for
memory cleanup of idle conversations.

## Branching

```ts
await ctx.reply('Choose: basic or pro');
const plan = await conv.waitForText();

if (plan === 'pro') {
    await ctx.reply('Send company name.');
    const company = await conv.waitForText();
    await ctx.reply(`Pro plan for ${company}.`);
} else {
    await ctx.reply('Basic plan selected.');
}
```

Because the handler is plain async TypeScript, you can use normal `if`, `switch`,
loops, and helper functions.

## Status and Exit

```ts
bot.command('cancel', ctx => {
    conversations.leave(ctx);
    return ctx.reply('Conversation cancelled.');
});

bot.command('status', ctx => {
    return ctx.reply(conversations.isActive(ctx) ? 'Active' : 'No active conversation');
});
```

Call `cancelAll()` during graceful shutdown if you need to clear timers before
closing external resources.

## Conversation vs Wizard

| Use Conversations when... | Use Wizards when... |
| --- | --- |
| Steps branch heavily. | Steps are mostly linear. |
| You want `await`-style flow control. | You want explicit step handlers. |
| A step can accept multiple input types. | Each step has a fixed expected input. |
| The flow is easier to read as one async function. | The flow is easier to split into steps. |
