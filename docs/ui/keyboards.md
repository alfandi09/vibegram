# Keyboards

VibeGram provides a declarative `Markup` builder for constructing Telegram keyboards.

## Inline Keyboards

Inline keyboards appear directly below messages:

```typescript
import { Markup } from 'vibegram';

const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'buy_1'), Markup.button.callback('Cancel', 'cancel')],
    [Markup.button.url('Website', 'https://example.com')]
]);

await ctx.reply('Choose an option:', { reply_markup: keyboard });
```

### Button Types

| Method | Description |
|--------|-------------|
| `Markup.button.callback(text, data)` | Callback button — triggers `bot.action()` |
| `Markup.button.url(text, url)` | Opens a URL |
| `Markup.button.switchInlineQuery(text, query)` | Opens inline query in another chat |
| `Markup.button.switchInlineQueryCurrentChat(text, query)` | Opens inline query in current chat |
| `Markup.button.login(text, url)` | Telegram Login button |
| `Markup.button.pay(text)` | Payment button |
| `Markup.button.webApp(text, url)` | Opens a Mini App |
| `Markup.button.game(text)` | Game button |

## Reply Keyboards

Reply keyboards replace the device keyboard:

```typescript
const keyboard = Markup.keyboard([
    [Markup.replyButton.text('📢 News'), Markup.replyButton.text('⚙️ Settings')],
    [Markup.replyButton.requestContact('📱 Share Phone')],
    [Markup.replyButton.requestLocation('📍 Share Location')],
    [Markup.replyButton.requestPoll('📊 Create Poll')]
], {
    resize_keyboard: true,
    one_time_keyboard: false
});

await ctx.reply('Menu:', { reply_markup: keyboard });
```

### Reply Button Types

| Method | Description |
|--------|-------------|
| `Markup.replyButton.text(text)` | Plain text button |
| `Markup.replyButton.requestContact(text)` | Request phone number |
| `Markup.replyButton.requestLocation(text)` | Request location |
| `Markup.replyButton.requestPoll(text)` | Request poll creation |

## Remove Keyboard

```typescript
await ctx.reply('Keyboard removed.', {
    reply_markup: Markup.removeKeyboard()
});
```

## Force Reply

Force the user to reply to your message:

```typescript
await ctx.reply('What is your name?', {
    reply_markup: Markup.forceReply({
        input_field_placeholder: 'Type your name...'
    })
});
```
