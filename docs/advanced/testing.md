# Testing

`vibegram/testing` runs your bot offline. It intercepts every outgoing Bot API call,
records it, and returns realistic results, so tests need no token and no network.

```typescript
import { describe, expect, it } from 'vitest';
import { Bot, Markup } from 'vibegram';
import { createTestBot } from 'vibegram/testing';

function buildBot() {
    const bot = new Bot('test-token');
    bot.command('start', ctx =>
        ctx.reply('Welcome!', {
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Shop', 'shop')]]),
        })
    );
    bot.action('shop', ctx => ctx.answerCbQuery('Opening shop...'));
    return bot;
}

describe('bot', () => {
    it('greets on /start', async () => {
        const t = createTestBot(buildBot());

        await t.sendCommand('start');

        const call = t.lastCall('sendMessage');
        expect(call?.payload.text).toBe('Welcome!');
        expect(call?.payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('shop');
    });

    it('answers button presses', async () => {
        const t = createTestBot(buildBot());
        await t.pressButton('shop');
        expect(t.lastCall('answerCallbackQuery')?.payload.text).toBe('Opening shop...');
    });
});
```

## Sending updates

| Method | Sends |
| --- | --- |
| `sendText(text, options?)` | A text message. |
| `sendCommand(name, args?, options?)` | `/name args` with a `bot_command` entity. |
| `sendMessage(fields, options?)` | A message with any fields, e.g. `{ photo: [...] }`. |
| `pressButton(data, options?)` | A callback query. |
| `sendUpdate(update)` | A raw update (`update_id` filled in). |

Message options: `from`, `chat`, `message` (extra fields), and `updateType`
(`'edited_message'`, `'channel_post'`, ...). Each method resolves after the bot's
middleware finishes; errors without `bot.catch()` reject.

```typescript
await t.sendText('hi', { chat: { id: -100, type: 'supergroup', title: 'Team' } });
await t.sendCommand('start', undefined, { updateType: 'edited_message' });
```

## Inspecting calls

| Member | Description |
| --- | --- |
| `calls` | Every outgoing call, in order (`{ method, payload }`). |
| `callsOf(method)` | Calls for one method. |
| `lastCall(method?)` | Most recent call. |
| `clearCalls()` | Reset the recording. |

By default, `send*` / `edit*` / `copyMessage` / `forwardMessage` return a generated
`Message`, `getMe` returns a bot user, and everything else returns `true`.

## Stubbing results and errors

```typescript
const t = createTestBot(bot)
    .stub('getChatMember', { status: 'administrator', user: { id: 1, is_bot: false, first_name: 'A' } })
    .stub('sendMessage', call => {
        if (call.payload.chat_id === BLOCKED_CHAT) throw new Error('Forbidden: bot was blocked');
        return { message_id: 1, date: 0, chat: { id: call.payload.chat_id, type: 'private' } };
    });
```

`createTestBot(bot, { user, chat, botInfo })` sets the default sender, chat, and bot
identity. The kit installs a `bot.client` request transformer, so it also covers
`bot.callApi()` and `bot.client.callApi()` calls made outside handlers.
