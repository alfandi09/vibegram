# Conversations

Conversations provide a fluent, `await`-based API for building multi-step dialogues. Unlike Wizards (which use sequential step arrays), Conversations let you write natural async/await code with branching, loops, and validation.

## Quick Start

```typescript
import { Bot, session, Conversation } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(session());

const conv = new Conversation();

conv.define('order', async (ctx, c) => {
    await ctx.reply('What product do you want?');
    const product = await c.waitForText();

    await ctx.reply('How many?');
    const qty = await c.waitForText({
        validate: (ctx) => !isNaN(parseInt(ctx.message?.text || '')),
        validationError: 'Please enter a valid number.'
    });

    await ctx.reply(`Order confirmed: ${parseInt(qty)}x ${product}`);
});

bot.use(conv.middleware());
bot.command('order', ctx => conv.enter('order', ctx));
```

## Wait Methods

| Method | Returns | Waits for |
|--------|---------|-----------|
| `conv.waitForText(opts?)` | `string` | Text message |
| `conv.waitForPhoto(opts?)` | `PhotoSize[]` | Photo message |
| `conv.waitForCallbackQuery(opts?)` | `string` | Inline button press |
| `conv.waitForContact(opts?)` | `Contact` | Shared contact |
| `conv.waitForLocation(opts?)` | `Location` | Shared location |
| `conv.wait(opts?)` | `Context` | Any update (raw) |

## Validation

If validation fails, the user is re-prompted automatically:

```typescript
const email = await c.waitForText({
    validate: (ctx) => /\S+@\S+\.\S+/.test(ctx.message?.text || ''),
    validationError: 'Please enter a valid email address.'
});
```

## Timeouts

```typescript
try {
    const answer = await c.waitForText({ timeout: 30000 }); // 30 seconds
    await ctx.reply(`You said: ${answer}`);
} catch (err) {
    if (err instanceof ConversationTimeout) {
        await ctx.reply('Time is up! Conversation cancelled.');
    }
}
```

## Branching

Because conversations are plain async functions, you can use any control flow:

```typescript
conv.define('support', async (ctx, c) => {
    await ctx.reply('What do you need help with?\n1. Billing\n2. Technical');
    const choice = await c.waitForText();

    if (choice === '1') {
        await ctx.reply('Describe your billing issue:');
        const issue = await c.waitForText();
        await ctx.reply(`Billing ticket created: "${issue}"`);
    } else {
        await ctx.reply('Describe the technical problem:');
        const issue = await c.waitForText();
        await ctx.reply('Attach a screenshot if possible:');
        try {
            const photo = await c.waitForPhoto({ timeout: 60000 });
            await ctx.reply('Screenshot received. Ticket created.');
        } catch {
            await ctx.reply('No screenshot provided. Ticket created without attachment.');
        }
    }
});
```

## Conversation vs Wizard

| Feature | Wizard | Conversation |
|---------|--------|-------------|
| Code style | Array of step functions | Single async function |
| Branching | Manual cursor jumping | Native if/else |
| Validation | Manual (don't call next) | Built-in validate/retry |
| Timeouts | Not built-in | Built-in |
| Input types | Text only | Text, photo, callback, contact, location |

::: tip
Use **Wizards** for simple linear forms. Use **Conversations** for complex flows with branching, validation, and multiple input types.
:::
