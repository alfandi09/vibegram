# Routing & Listeners

VibeGram provides several methods for routing incoming updates to handler functions.

## Commands

```typescript
bot.command('start', async (ctx) => {
    await ctx.reply('Hello!');
});

// Access parsed arguments
bot.command('ban', async (ctx) => {
    const args = ctx.command?.args; // ['@user', 'spam']
    const target = args?.[0];
    const reason = args?.slice(1).join(' ');
});
```

## Text Matching

```typescript
// Exact string match
bot.hears('hello', ctx => ctx.reply('Hi!'));

// Regex match
bot.hears(/price (\d+)/i, ctx => ctx.reply('Price matched!'));
```

## Event Listeners

Listen for specific update types using `bot.on()`:

```typescript
bot.on('message', ctx => { /* any message */ });
bot.on('photo', ctx => { /* photo messages */ });
bot.on('document', ctx => { /* document messages */ });
bot.on('sticker', ctx => { /* sticker messages */ });
bot.on('voice', ctx => { /* voice messages */ });
bot.on('video', ctx => { /* video messages */ });
bot.on('video_note', ctx => { /* circular video notes */ });
bot.on('animation', ctx => { /* GIF/animations */ });
bot.on('contact', ctx => { /* shared contacts */ });
bot.on('location', ctx => { /* shared locations */ });
bot.on('poll', ctx => { /* poll updates */ });
bot.on('callback_query', ctx => { /* inline button presses */ });
bot.on('inline_query', ctx => { /* inline mode queries */ });
bot.on('edited_message', ctx => { /* edited messages */ });
bot.on('channel_post', ctx => { /* channel posts */ });
bot.on('chat_member', ctx => { /* member status changes */ });
bot.on('chat_join_request', ctx => { /* join requests */ });
```

## Callback Actions

Handle inline keyboard button presses:

```typescript
// Exact match
bot.action('confirm_order', async (ctx) => {
    await ctx.answerCbQuery('Order confirmed!');
});

// Regex match
bot.action(/item_(\d+)/, async (ctx) => {
    const itemId = ctx.update.callback_query?.data?.split('_')[1];
    await ctx.answerCbQuery(`Selected item ${itemId}`);
});
```

::: warning
Since v1.1, `bot.action()` no longer auto-answers callback queries. You must call `ctx.answerCbQuery()` manually in your handler to dismiss the loading indicator.
:::

## Inline Queries

```typescript
bot.on('inline_query', async (ctx) => {
    const results = [
        { type: 'article', id: '1', title: 'Result 1', input_message_content: { message_text: 'Hello!' } }
    ];
    await ctx.answerInlineQuery(results);
});
```
