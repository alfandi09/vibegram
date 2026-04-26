# Bot Methods

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
