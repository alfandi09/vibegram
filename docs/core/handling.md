# Routing & Listeners

VibeGram routes incoming updates through middleware and listener helpers on
`Bot` and `Composer`.

## Commands

```ts
bot.command('start', async ctx => {
    await ctx.reply('Hello!');
});

bot.command(['help', 'info'], async ctx => {
    await ctx.reply('Available commands: /start /help');
});
```

Command handlers receive parsed metadata in `ctx.command`.

## Command Arguments

```ts
bot.command('ban', async ctx => {
    const target = ctx.command?.args[0];
    const reason = ctx.command?.args.slice(1).join(' ');

    await ctx.reply(`Target: ${target}, reason: ${reason}`);
});
```

Commands with bot username suffixes are target-aware. `/start` still matches,
`/start@YourBot` matches this bot, and `/start@OtherBot` is ignored after the
bot username is known from `getMe()`.

## Text Matching

```ts
bot.hears('ping', ctx => ctx.reply('Pong!'));

bot.hears(/^price (\d+)/i, ctx => {
    const amount = ctx.match?.[1];
    return ctx.reply(`Price matched: ${amount}`);
});

bot.hears(['hello', 'hi', /^hey/i], ctx => ctx.reply('Hello!'));
```

When the trigger is a regular expression, capture groups are available through
`ctx.match`.

## Callback Actions

```ts
bot.action('confirm_order', async ctx => {
    await ctx.answerCbQuery('Order confirmed');
    await ctx.editMessageText('Order confirmed.');
});

bot.action(/^item_(\d+)$/, async ctx => {
    const itemId = ctx.match?.[1];
    await ctx.answerCbQuery(`Selected item ${itemId}`);
});
```

`bot.action()` does not auto-answer callback queries. Call `ctx.answerCbQuery()`
inside the handler to dismiss Telegram's loading indicator.

## Event Listeners

```ts
bot.on('message', ctx => {
    console.log('New message', ctx.message?.message_id);
});

bot.on('photo', ctx => ctx.reply('Photo received.'));
bot.on('document', ctx => ctx.reply('Document received.'));
bot.on('callback_query', ctx => ctx.answerCbQuery());

bot.on(['photo', 'video', 'document'], ctx => ctx.reply('Media received.'));
```

`bot.on()` accepts root update types and common message properties.

## Inline Queries

```ts
bot.on('inline_query', async ctx => {
    await ctx.answerInlineQuery([
        {
            type: 'article',
            id: '1',
            title: 'Result 1',
            input_message_content: { message_text: 'Hello!' },
        },
    ]);
});
```

Inline query handlers must answer with result objects supported by Telegram.

## Execution Order

Middleware and listeners run in registration order.

```ts
bot.use(logger());         // 1. Runs for every update
bot.on('message', handle); // 2. Runs for messages
bot.command('start', fn);  // 3. Runs for /start
bot.hears(/hi/i, fn);      // 4. Runs for matching text
```

Put security, logging, session, and rate-limit middleware before handlers that
depend on them.

## Composing Listeners

```ts
import { Composer } from 'vibegram';

const media = new Composer();
media.on('photo', handlePhoto);
media.on('video', handleVideo);
media.on('document', handleDocument);

bot.use(media);
```

Use `Composer` to group related routes into modules or plugins.
