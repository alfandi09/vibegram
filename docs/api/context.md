# Context (ctx)

<ApiMethodCard title="Context shortcuts" endpoint="per-update ctx" since="1.0.0" returns="Context" method="API">
  Context is created for every update and wraps the scoped Telegram client, parsed update
  fields, session state, scene/wizard helpers, and reply shortcuts.
</ApiMethodCard>

<FeatureGrid title="Context surfaces" description="Use this page as a map of the most common per-update methods.">
  <FeatureCard title="Messaging" description="Reply with text, HTML, Markdown, drafts, and media." href="#messaging-methods" />
  <FeatureCard title="Interaction" description="Answer callback queries, inline queries, polls, invoices, and chat actions." href="#interactive-methods" />
  <FeatureCard title="Administration" description="Manage members, permissions, invite links, gifts, and Stars." href="#admin-methods" />
</FeatureGrid>

The `Context` object is created for every incoming update and provides shortcuts for all Telegram Bot API operations.

## Properties

| Property       | Type             | Description                                |
| -------------- | ---------------- | ------------------------------------------ |
| `ctx.update`   | `Update`         | Raw update object from Telegram            |
| `ctx.message`  | `Message`        | The incoming message (if any)              |
| `ctx.from`     | `User`           | The user who sent the update               |
| `ctx.chat`     | `Chat`           | The chat where the update occurred         |
| `ctx.command`  | `object`         | Parsed command data (`{ command, args }`)  |
| `ctx.session`  | `any`            | Session data (requires session middleware) |
| `ctx.scene`    | `object`         | Scene navigation controls                  |
| `ctx.wizard`   | `object`         | Wizard step controls                       |
| `ctx.i18n`     | `object`         | Internationalization helper                |
| `ctx.telegram` | `TelegramClient` | Scoped direct Telegram API client          |

## Messaging Methods

| Method                                  | API                | Description                         |
| --------------------------------------- | ------------------ | ----------------------------------- |
| `ctx.reply(text, extra?)`               | `sendMessage`      | Send a text message                 |
| `ctx.replyWithHTML(text, extra?)`       | `sendMessage`      | Reply with HTML formatting          |
| `ctx.replyWithMarkdown(text, extra?)`   | `sendMessage`      | Reply with Markdown formatting      |
| `ctx.replyWithMarkdownV2(text, extra?)` | `sendMessage`      | Reply with MarkdownV2 formatting    |
| `ctx.replyWithDraft(text, extra?)`      | `sendMessageDraft` | Pre-fill user input field (API 9.5) |

## Media Methods

| Method                                         | API              | Description                |
| ---------------------------------------------- | ---------------- | -------------------------- |
| `ctx.replyWithPhoto(photo, extra?)`            | `sendPhoto`      | Send a photo               |
| `ctx.replyWithVideo(video, extra?)`            | `sendVideo`      | Send a video               |
| `ctx.replyWithAudio(audio, extra?)`            | `sendAudio`      | Send an audio file         |
| `ctx.replyWithDocument(doc, extra?)`           | `sendDocument`   | Send a document            |
| `ctx.replyWithVoice(voice, extra?)`            | `sendVoice`      | Send a voice note          |
| `ctx.replyWithVideoNote(note, extra?)`         | `sendVideoNote`  | Send a circular video note |
| `ctx.replyWithAnimation(anim, extra?)`         | `sendAnimation`  | Send a GIF/animation       |
| `ctx.replyWithSticker(sticker, extra?)`        | `sendSticker`    | Send a sticker             |
| `ctx.replyWithMediaGroup(media, extra?)`       | `sendMediaGroup` | Send an album              |
| `ctx.replyWithPaidMedia(stars, media, extra?)` | `sendPaidMedia`  | Send paid media (Stars)    |
| `ctx.replyWithGame(gameShortName, extra?)`     | `sendGame`       | Send a game                |

## Interactive Methods

| Method                                              | API            | Description            |
| --------------------------------------------------- | -------------- | ---------------------- |
| `ctx.replyWithPoll(question, options, extra?)`      | `sendPoll`     | Send a poll            |
| `ctx.replyWithDice(extra?)`                         | `sendDice`     | Send an animated dice  |
| `ctx.replyWithLocation(lat, lon, extra?)`           | `sendLocation` | Send a location        |
| `ctx.replyWithVenue(lat, lon, title, addr, extra?)` | `sendVenue`    | Send a venue           |
| `ctx.replyWithContact(phone, name, extra?)`         | `sendContact`  | Send a contact         |
| `ctx.replyWithInvoice(...)`                         | `sendInvoice`  | Send a payment invoice |
| `ctx.sendGift(userId, giftId, extra?)`              | `sendGift`     | Send a gift to a user  |
| `ctx.sendGiftToChat(chatId, giftId, extra?)`        | `sendGift`     | Send a gift to a chat  |

## Message Manipulation

| Method                                          | API                       | Description          |
| ----------------------------------------------- | ------------------------- | -------------------- |
| `ctx.editMessageText(text, extra?)`             | `editMessageText`         | Edit message text    |
| `ctx.editMessageCaption(caption, extra?)`       | `editMessageCaption`      | Edit message caption |
| `ctx.editMessageMedia(media, extra?)`           | `editMessageMedia`        | Edit message media   |
| `ctx.editMessageLiveLocation(lat, lon, extra?)` | `editMessageLiveLocation` | Edit a live location |
| `ctx.stopMessageLiveLocation(extra?)`           | `stopMessageLiveLocation` | Stop a live location |
| `ctx.editMessageReplyMarkup(markup)`            | `editMessageReplyMarkup`  | Edit inline keyboard |
| `ctx.deleteMessage(messageId?)`                 | `deleteMessage`           | Delete a message     |
| `ctx.copyMessage(toChatId, extra?)`             | `copyMessage`             | Copy a message       |
| `ctx.forwardMessage(toChatId, extra?)`          | `forwardMessage`          | Forward a message    |
| `ctx.pinChatMessage(messageId?, notify?)`       | `pinChatMessage`          | Pin a message        |
| `ctx.unpinChatMessage(messageId?)`              | `unpinChatMessage`        | Unpin a message      |

## Callback & Query Responses

| Method                                      | API                      | Description             |
| ------------------------------------------- | ------------------------ | ----------------------- |
| `ctx.answerCbQuery(text?, showAlert?)`      | `answerCallbackQuery`    | Respond to button press |
| `ctx.answerInlineQuery(results, extra?)`    | `answerInlineQuery`      | Respond to inline query |
| `ctx.answerPreCheckoutQuery(ok, errorMsg?)` | `answerPreCheckoutQuery` | Respond to checkout     |

## Admin Methods

| Method                                          | API                      | Description             |
| ----------------------------------------------- | ------------------------ | ----------------------- |
| `ctx.banChatMember(userId, extra?)`             | `banChatMember`          | Ban a user              |
| `ctx.unbanChatMember(userId, extra?)`           | `unbanChatMember`        | Unban a user            |
| `ctx.restrictChatMember(userId, perms, extra?)` | `restrictChatMember`     | Restrict a user         |
| `ctx.promoteChatMember(userId, perms?)`         | `promoteChatMember`      | Promote to admin        |
| `ctx.setChatPermissions(perms, extra?)`         | `setChatPermissions`     | Set default permissions |
| `ctx.getChatMember(userId)`                     | `getChatMember`          | Get member info         |
| `ctx.getChatMembersCount()`                     | `getChatMemberCount`     | Get member count        |
| `ctx.approveChatJoinRequest(userId)`            | `approveChatJoinRequest` | Approve join request    |
| `ctx.declineChatJoinRequest(userId)`            | `declineChatJoinRequest` | Decline join request    |
| `ctx.leaveChat()`                               | `leaveChat`              | Leave the current chat  |

## Utility Methods

| Method                                        | API                             | Description                            |
| --------------------------------------------- | ------------------------------- | -------------------------------------- |
| `ctx.sendChatAction(action)`                  | `sendChatAction`                | Show typing indicator, etc.            |
| `ctx.setReaction(emoji)`                      | `setMessageReaction`            | React to a message                     |
| `ctx.getChat()`                               | `getChat`                       | Get full chat info                     |
| `ctx.createChatInviteLink(extra?)`            | `createChatInviteLink`          | Create invite link                     |
| `ctx.exportChatInviteLink()`                  | `exportChatInviteLink`          | Export primary invite link             |
| `ctx.getFileLink(fileId)`                     | `getFile`                       | Get file download URL                  |
| `ctx.downloadFile(fileId, destPath?)`         | —                               | Download file to disk or buffer        |
| `ctx.getAvailableGifts()`                     | `getAvailableGifts`             | List gifts available to the bot        |
| `ctx.getUserGifts(userId, extra?)`            | `getUserGifts`                  | List gifts owned by a user             |
| `ctx.getBusinessAccountGifts(id, extra?)`     | `getBusinessAccountGifts`       | List gifts owned by a business account |
| `ctx.getMyStarBalance()`                      | `getMyStarBalance`              | Get the bot's Star balance             |
| `ctx.getBusinessAccountStarBalance(id)`       | `getBusinessAccountStarBalance` | Get a business account's Star balance  |
| `ctx.getStarTransactions(extra?)`             | `getStarTransactions`           | Get Star transaction history           |
| `ctx.transferBusinessAccountStars(id, count)` | `transferBusinessAccountStars`  | Transfer Stars from business account   |
| `ctx.approveSuggestedPost(messageId, extra?)` | `approveSuggestedPost`          | Approve a suggested post               |
| `ctx.declineSuggestedPost(messageId, extra?)` | `declineSuggestedPost`          | Decline a suggested post               |

## Examples

```typescript
// Send a photo with caption and inline keyboard
await ctx.replyWithPhoto('https://example.com/image.jpg', {
    caption: '<b>Product Name</b>\nPrice: $9.99',
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Buy Now', 'buy_1')]]),
});

// Create a poll
await ctx.replyWithPoll('Favorite color?', [{ text: 'Red' }, { text: 'Blue' }, { text: 'Green' }]);

// Send a checklist using the current Bot API payload shape
await ctx.replyWithChecklist({
    title: 'Launch tasks',
    tasks: [{ text: 'Update changelog' }, { text: 'Run release checklist' }],
});

// Edit a message after delay
const msg = await ctx.reply('Loading...');
setTimeout(() => ctx.editMessageText('Done!'), 2000);

// Call a Telegram API method that has no shortcut yet
await ctx.telegram.callApi('sendChatAction', {
    chat_id: ctx.chat!.id,
    action: 'typing',
});
```
