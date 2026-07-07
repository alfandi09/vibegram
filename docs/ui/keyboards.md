# Keyboards

VibeGram provides a declarative `Markup` builder for Telegram inline keyboards,
reply keyboards, pagination, and safe text escaping.

## Inline Keyboards

Inline keyboards appear below a message and usually trigger callback queries or
open Telegram-supported surfaces.

```ts
import { Markup } from 'vibegram';

const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'buy_1'), Markup.button.callback('Cancel', 'cancel')],
    [Markup.button.url('Website', 'https://example.com')],
]);

await ctx.reply('Choose an option:', { reply_markup: keyboard });
```

## Markup.grid()

Use `Markup.grid()` when you already have a flat array of inline buttons and
want VibeGram to split it into rows.

```ts
const days = ['Mon', 'Tue', 'Wed', 'Thu'].map(day => {
    return Markup.button.callback(day, `day:${day}`);
});

await ctx.reply('Pick a day:', {
    reply_markup: Markup.grid(days, 2),
});
```

## Inline Button Types

| Method | Description |
| --- | --- |
| `Markup.button.callback(text, data)` | Sends callback data to `bot.action()`. |
| `Markup.button.url(text, url)` | Opens an external URL. |
| `Markup.button.webApp(text, url)` | Opens a Telegram Mini App. |
| `Markup.button.pay(text)` | Payment button for invoice messages. |
| `Markup.button.switchInlineQuery(text, query)` | Opens inline mode in another chat. |
| `Markup.button.switchInlineQueryCurrentChat(text, query)` | Opens inline mode in the current chat. |
| `Markup.button.login(text, loginUrl)` | Telegram Login button. |
| `Markup.button.copy(text, textToCopy)` | Copy-to-clipboard button. |

## Login Button Example

```ts
await ctx.reply('Sign in:', {
    reply_markup: Markup.inlineKeyboard([
        [
            Markup.button.login('Login with Telegram', {
                url: 'https://example.com/auth/telegram',
                request_write_access: true,
            }),
        ],
    ]),
});
```

## Copy Button Example

```ts
await ctx.reply('Copy your invite code:', {
    reply_markup: Markup.inlineKeyboard([
        [Markup.button.copy('Copy code', 'INVITE-2026')],
    ]),
});
```

## Pagination

```ts
const items = products.map(product => ({
    text: product.name,
    callback_data: `product:${product.id}`,
}));

await ctx.reply('Catalog:', {
    reply_markup: Markup.pagination(items, {
        currentPage: 1,
        itemsPerPage: 6,
        columns: 2,
        actionPrev: 'catalog:prev',
        actionNext: 'catalog:next',
        pageIndicatorPattern: '{current}/{total}',
    }),
});
```

Handle `actionPrev`, `actionNext`, and item callback data with `bot.action()`.

## Reply Keyboards

Reply keyboards replace the device keyboard with Telegram-native buttons.

```ts
const keyboard = Markup.keyboard(
    [
        [Markup.replyButton.text('News'), Markup.replyButton.text('Settings')],
        [Markup.replyButton.requestContact('Share phone')],
        [Markup.replyButton.requestLocation('Share location')],
    ],
    {
        resize_keyboard: true,
        one_time_keyboard: false,
    }
);

await ctx.reply('Menu:', { reply_markup: keyboard });
```

## Reply Button Types

| Method | Description |
| --- | --- |
| `Markup.replyButton.text(text)` | Plain text button. |
| `Markup.replyButton.requestContact(text)` | Requests the user's phone number. |
| `Markup.replyButton.requestLocation(text)` | Requests the user's location. |
| `Markup.replyButton.requestPoll(text, type?)` | Opens poll creation. |
| `Markup.replyButton.requestUser(text, requestId, options?)` | Opens Telegram user selection. |
| `Markup.replyButton.requestChat(text, requestId, options?)` | Opens chat selection. |
| `Markup.replyButton.requestManagedBot(text, requestId, options?)` | Requests managed bot authorization. |

## Remove Keyboard

```ts
await ctx.reply('Keyboard removed.', {
    reply_markup: Markup.removeKeyboard(),
});
```

## Force Reply

```ts
await ctx.reply('What is your name?', {
    reply_markup: Markup.forceReply({
        input_field_placeholder: 'Type your name...',
    }),
});
```

## Escaping Untrusted Text

When interpolating user-supplied text into a message with `parse_mode`, escape
only the dynamic values.

```ts
const safeHtml = Markup.escapeHTML(userName);
await ctx.reply(`Hello <b>${safeHtml}</b>`, { parse_mode: 'HTML' });

const safeMarkdown = Markup.escapeMarkdownV2(userName);
await ctx.reply(`Hello *${safeMarkdown}*`, { parse_mode: 'MarkdownV2' });

const safeLegacyMarkdown = Markup.escapeMarkdown(userName);
await ctx.reply(`Hello _${safeLegacyMarkdown}_`, { parse_mode: 'Markdown' });
```

| Helper | Use with |
| --- | --- |
| `Markup.escapeHTML(text)` | `parse_mode: 'HTML'` |
| `Markup.escapeMarkdownV2(text)` | `parse_mode: 'MarkdownV2'` |
| `Markup.escapeMarkdown(text)` | `parse_mode: 'Markdown'` (legacy) |

If the whole reply is dynamic user content, send plain text without
`parse_mode`.
