# Bot Methods

<ApiMethodCard title="Bot instance API" endpoint="new Bot(token)" since="1.0.0" returns="Bot" method="CLASS">
  Bot-level methods are available outside a single update and are used for launch control,
  webhook registration, direct Bot API calls, command menus, plugins, and business wrappers.
</ApiMethodCard>

<FeatureGrid title="Bot method groups" description="Start with lifecycle methods, then move to routing and direct Telegram API wrappers.">
  <FeatureCard title="Lifecycle" description="Launch polling or webhook mode and stop gracefully." href="#instance-methods" />
  <FeatureCard title="Routing" description="Register middleware, commands, listeners, actions, and global error handlers." href="#routing-methods" />
  <FeatureCard title="Business APIs" description="Call business account, gifts, stories, and direct API wrappers." href="#business-account-methods" />
  <FeatureCard title="Bot API 10.0" description="Use guest replies, live photos, reaction cleanup, and managed bot access settings." href="#bot-api-100-methods" />
  <FeatureCard title="Bot API 10.3" description="Ephemeral messages, block-based rich messages, and draft stop buttons." href="#bot-api-103-methods" />
</FeatureGrid>

Methods available directly on the `Bot` instance (no Context required).

## Instance Methods

| Method                                    | Description                                  |
| ----------------------------------------- | -------------------------------------------- |
| `bot.launch()`                            | Start long-polling                           |
| `bot.stop(reason?)`                       | Stop polling gracefully                      |
| `bot.handleUpdate(update)`                | Process a raw update object manually         |
| `bot.webhookCallback(secretToken?)`       | Create an Express-compatible webhook handler |
| `bot.callApi(method, params?)`            | Call any Telegram API method directly        |
| `bot.validateWebAppData(initData, opts?)` | Validate Mini App initData                   |
| `bot.plugin(plugin)`                      | Install a VibeGram plugin                    |
| `bot.getMe()`                             | Get bot info                                 |
| `bot.setWebhook(url, extra?)`             | Register a webhook                           |
| `bot.deleteWebhook(dropPendingUpdates?)`  | Delete the current webhook                   |
| `bot.getWebhookInfo()`                    | Read webhook configuration                   |
| `bot.setMyCommands(commands, extra?)`     | Set command menu                             |
| `bot.getMyCommands(extra?)`               | Get command list                             |
| `bot.deleteMyCommands(extra?)`            | Delete command menu                          |

Constructor polling options are configured with `new Bot(token, options)`.
Runtime launch options are passed to `bot.launch(options?)`.

## Routing Methods

Inherited from `Composer`:

| Method                         | Description                    |
| ------------------------------ | ------------------------------ |
| `bot.use(middleware)`          | Register middleware            |
| `bot.command(name, handler)`   | Handle `/command` messages     |
| `bot.hears(trigger, handler)`  | Match text patterns            |
| `bot.on(event, handler)`       | Listen for update types        |
| `bot.action(trigger, handler)` | Handle callback button presses |
| `bot.catch(handler)`           | Global error handler           |

## Business Account Methods

These wrappers map directly to Telegram Bot API payload names.

| Method                                                              | API                                 |
| ------------------------------------------------------------------- | ----------------------------------- |
| `bot.getBusinessConnection(id)`                                     | `getBusinessConnection`             |
| `bot.readBusinessMessage(id, chatId, messageId)`                    | `readBusinessMessage`               |
| `bot.deleteBusinessMessages(id, messageIds)`                        | `deleteBusinessMessages`            |
| `bot.setBusinessAccountName(id, firstName, extra?)`                 | `setBusinessAccountName`            |
| `bot.setBusinessAccountUsername(id, username?)`                     | `setBusinessAccountUsername`        |
| `bot.setBusinessAccountBio(id, bio?)`                               | `setBusinessAccountBio`             |
| `bot.setBusinessAccountProfilePhoto(id, photo, extra?)`             | `setBusinessAccountProfilePhoto`    |
| `bot.removeBusinessAccountProfilePhoto(id, extra?)`                 | `removeBusinessAccountProfilePhoto` |
| `bot.setBusinessAccountGiftSettings(id, showButton, acceptedTypes)` | `setBusinessAccountGiftSettings`    |

## Bot API 10.0 Methods {#bot-api-100-methods}

These wrappers expose the Bot API 10.0 additions while keeping Telegram's official payload names.

| Method                                           | API                           |
| ------------------------------------------------ | ----------------------------- |
| `bot.answerGuestQuery(guestQueryId, result)`     | `answerGuestQuery`            |
| `bot.sendLivePhoto(chatId, livePhoto, photo)`    | `sendLivePhoto`               |
| `bot.getChatAdministrators(chatId, extra?)`      | `getChatAdministrators`       |
| `bot.deleteMessageReaction(chatId, messageId)`   | `deleteMessageReaction`       |
| `bot.deleteAllMessageReactions(chatId, extra?)`  | `deleteAllMessageReactions`   |
| `bot.getManagedBotAccessSettings(userId)`        | `getManagedBotAccessSettings` |
| `bot.setManagedBotAccessSettings(userId, opts)`  | `setManagedBotAccessSettings` |
| `bot.getUserPersonalChatMessages(userId, limit)` | `getUserPersonalChatMessages` |

## Bot API 10.2 / 10.3 Methods {#bot-api-103-methods}

Ephemeral messages are visible only to one member of a group and the bot.
Non-admin bots must answer within 15 seconds of a callback query or an incoming
ephemeral command; `ctx.replyEphemeral()` links both automatically.

| Method                                                                  | API                               |
| ----------------------------------------------------------------------- | --------------------------------- |
| `ctx.replyEphemeral(text, extra?)`                                      | `sendMessage` + ephemeral params  |
| `bot.editEphemeralMessageText(chatId, userId, id, textOrRich, extra?)`  | `editEphemeralMessageText`        |
| `bot.editEphemeralMessageMedia(chatId, userId, id, media, extra?)`      | `editEphemeralMessageMedia`       |
| `bot.editEphemeralMessageCaption(chatId, userId, id, caption?, extra?)` | `editEphemeralMessageCaption`     |
| `bot.editEphemeralMessageReplyMarkup(chatId, userId, id, markup?)`      | `editEphemeralMessageReplyMarkup` |
| `bot.deleteEphemeralMessage(chatId, userId, id)`                        | `deleteEphemeralMessage`          |
| `bot.sendMessageDraft(chatId, draftId, text, extra?)`                   | `sendMessageDraft`                |

The `ctx.editEphemeralMessage*()` and `ctx.deleteEphemeralMessage()` shortcuts
target the current ephemeral message, or the one whose button was pressed.

```typescript
bot.setMyCommands([{ command: 'secret', description: 'Private answer', is_ephemeral: true }]);

bot.command('secret', ctx => ctx.replyEphemeral('Only you can see this.'));

bot.action('peek', ctx =>
    ctx.replyEphemeral('Your balance is 42 Stars', {
        ephemeral_message_parameters: {
            receiver_user_id: ctx.from!.id,
            callback_query_id: ctx.update.callback_query!.id,
            replace_callback_query_message: true,
        },
    })
);

// Stream a draft with a stop button (Bot API 10.3)
await ctx.replyWithDraft('Thinking...', { draft_id: 1, can_stop: true });
bot.on('stopped_message_generation', ctx => abortGeneration(ctx.update.stopped_message_generation!.draft_id));
```

Rich messages can now be built from typed blocks instead of HTML or Markdown:

```typescript
await bot.sendRichMessage(chatId, {
    blocks: [
        { type: 'heading', text: 'Release notes', size: 1 },
        { type: 'expandable_blockquote', text: 'Long changelog...' },
        { type: 'buttons', buttons: [{ text: 'Open', url: 'https://example.com' }] },
    ],
});
```

## Bot API 10.1 Methods {#bot-api-101-methods}

These wrappers expose the Bot API 10.1 additions while keeping Telegram's official payload names.

| Method                                                    | API                          |
| --------------------------------------------------------- | ---------------------------- |
| `bot.sendRichMessage(chatId, richMessage, extra?)`        | `sendRichMessage`            |
| `bot.sendRichMessageDraft(chatId, draftId, richMessage, extra?)` | `sendRichMessageDraft` |
| `bot.answerChatJoinRequestQuery(queryId, result)`         | `answerChatJoinRequestQuery` |
| `bot.sendChatJoinRequestWebApp(queryId, webAppUrl)`       | `sendChatJoinRequestWebApp`  |

```typescript
// Send a rich message (HTML or Markdown source — exactly one)
await bot.sendRichMessage(chatId, {
    html: '<h1>Release notes</h1><p>Now with <b>rich</b> formatting.</p>',
});

// Approve, decline, or queue a chat join request query
await bot.answerChatJoinRequestQuery(queryId, 'approve');
```

## Gifts and Stories

| Method                                                               | API                       |
| -------------------------------------------------------------------- | ------------------------- |
| `bot.getAvailableGifts()`                                            | `getAvailableGifts`       |
| `bot.sendGift(userId, giftId, extra?)`                               | `sendGift`                |
| `bot.sendGiftToChat(chatId, giftId, extra?)`                         | `sendGift`                |
| `bot.giftPremiumSubscription(userId, months, stars, extra?)`         | `giftPremiumSubscription` |
| `bot.getUserGifts(userId, extra?)`                                   | `getUserGifts`            |
| `bot.getChatGifts(chatId, extra?)`                                   | `getChatGifts`            |
| `bot.getBusinessAccountGifts(id, extra?)`                            | `getBusinessAccountGifts` |
| `bot.upgradeGift(id, ownedGiftId, extra?)`                           | `upgradeGift`             |
| `bot.transferGift(id, ownedGiftId, newOwnerChatId, extra?)`          | `transferGift`            |
| `bot.postStory(id, content, activePeriod, extra?)`                   | `postStory`               |
| `bot.repostStory(id, fromChatId, fromStoryId, activePeriod, extra?)` | `repostStory`             |
| `bot.editStory(id, storyId, content, extra?)`                        | `editStory`               |
| `bot.deleteStory(id, storyId)`                                       | `deleteStory`             |

## Direct API Calls

For methods not covered by Context shortcuts:

```typescript
// Call any Telegram API method
const result = await bot.callApi('sendMessage', {
    chat_id: 123456,
    text: 'Hello from callApi!',
});

// Set webhook
await bot.callApi('setWebhook', {
    url: 'https://example.com/webhook',
    secret_token: 'my-secret',
});
```

## Constructor and Launch Options

```ts
const bot = new Bot(process.env.BOT_TOKEN!, {
    polling: {
        allowed_updates: ['message', 'callback_query'],
        offsetCommit: 'processed',
    },
});

await bot.launch({
    onStart: me => {
        console.log(`@${me.username} online`);
    },
});
```

Use `offsetCommit: 'received'` for historical polling behavior. Use
`offsetCommit: 'processed'` when failed update handlers should be retried by the
next polling cycle.

## Plugin API

```ts
import { Preset, createPlugin } from 'vibegram';

const greetingPlugin = createPlugin('greeting', (bot, options: { message: string }) => {
    bot.command('hello', ctx => ctx.reply(options.message));
});

bot.plugin(greetingPlugin({ message: 'Hello!' }));

const productionPreset = new Preset('production', [
    greetingPlugin({ message: 'Hello!' }),
]);

bot.plugin(productionPreset);
```

Plugins install against the same composer surface as the bot, so they can
register middleware, commands, listeners, and error handlers.
