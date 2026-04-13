# Context (ctx)

The `Context` object is created for every incoming update and provides shortcuts for all Telegram Bot API operations.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.update` | `Update` | Raw update object from Telegram |
| `ctx.message` | `Message` | The incoming message (if any) |
| `ctx.from` | `User` | The user who sent the update |
| `ctx.chat` | `Chat` | The chat where the update occurred |
| `ctx.command` | `object` | Parsed command data (`{ command, args }`) |
| `ctx.session` | `any` | Session data (requires session middleware) |
| `ctx.scene` | `object` | Scene navigation controls |
| `ctx.wizard` | `object` | Wizard step controls |
| `ctx.i18n` | `object` | Internationalization helper |

## Messaging Methods

| Method | API | Description |
|--------|-----|-------------|
| `ctx.reply(text, extra?)` | `sendMessage` | Send a text message |
| `ctx.replyWithHTML(text, extra?)` | `sendMessage` | Reply with HTML formatting |
| `ctx.replyWithMarkdown(text, extra?)` | `sendMessage` | Reply with Markdown formatting |
| `ctx.replyWithMarkdownV2(text, extra?)` | `sendMessage` | Reply with MarkdownV2 formatting |
| `ctx.replyWithDraft(text, extra?)` | `sendMessageDraft` | Pre-fill user input field (API 9.5) |

## Media Methods

| Method | API | Description |
|--------|-----|-------------|
| `ctx.replyWithPhoto(photo, extra?)` | `sendPhoto` | Send a photo |
| `ctx.replyWithVideo(video, extra?)` | `sendVideo` | Send a video |
| `ctx.replyWithAudio(audio, extra?)` | `sendAudio` | Send an audio file |
| `ctx.replyWithDocument(doc, extra?)` | `sendDocument` | Send a document |
| `ctx.replyWithVoice(voice, extra?)` | `sendVoice` | Send a voice note |
| `ctx.replyWithVideoNote(note, extra?)` | `sendVideoNote` | Send a circular video note |
| `ctx.replyWithAnimation(anim, extra?)` | `sendAnimation` | Send a GIF/animation |
| `ctx.replyWithSticker(sticker, extra?)` | `sendSticker` | Send a sticker |
| `ctx.replyWithMediaGroup(media, extra?)` | `sendMediaGroup` | Send an album |
| `ctx.replyWithPaidMedia(stars, media, extra?)` | `sendPaidMedia` | Send paid media (Stars) |

## Interactive Methods

| Method | API | Description |
|--------|-----|-------------|
| `ctx.replyWithPoll(question, options, extra?)` | `sendPoll` | Send a poll |
| `ctx.replyWithDice(extra?)` | `sendDice` | Send an animated dice |
| `ctx.replyWithLocation(lat, lon, extra?)` | `sendLocation` | Send a location |
| `ctx.replyWithVenue(lat, lon, title, addr, extra?)` | `sendVenue` | Send a venue |
| `ctx.replyWithContact(phone, name, extra?)` | `sendContact` | Send a contact |
| `ctx.replyWithInvoice(...)` | `sendInvoice` | Send a payment invoice |

## Message Manipulation

| Method | API | Description |
|--------|-----|-------------|
| `ctx.editMessageText(text, extra?)` | `editMessageText` | Edit message text |
| `ctx.editMessageCaption(caption, extra?)` | `editMessageCaption` | Edit message caption |
| `ctx.editMessageReplyMarkup(markup)` | `editMessageReplyMarkup` | Edit inline keyboard |
| `ctx.deleteMessage(messageId?)` | `deleteMessage` | Delete a message |
| `ctx.copyMessage(toChatId, extra?)` | `copyMessage` | Copy a message |
| `ctx.forwardMessage(toChatId, extra?)` | `forwardMessage` | Forward a message |
| `ctx.pinChatMessage(messageId?, notify?)` | `pinChatMessage` | Pin a message |
| `ctx.unpinChatMessage(messageId?)` | `unpinChatMessage` | Unpin a message |

## Callback & Query Responses

| Method | API | Description |
|--------|-----|-------------|
| `ctx.answerCbQuery(text?, showAlert?)` | `answerCallbackQuery` | Respond to button press |
| `ctx.answerInlineQuery(results, extra?)` | `answerInlineQuery` | Respond to inline query |
| `ctx.answerPreCheckoutQuery(ok, errorMsg?)` | `answerPreCheckoutQuery` | Respond to checkout |

## Admin Methods

| Method | API | Description |
|--------|-----|-------------|
| `ctx.banChatMember(userId, extra?)` | `banChatMember` | Ban a user |
| `ctx.unbanChatMember(userId, extra?)` | `unbanChatMember` | Unban a user |
| `ctx.restrictChatMember(userId, perms, extra?)` | `restrictChatMember` | Restrict a user |
| `ctx.promoteChatMember(userId, perms?)` | `promoteChatMember` | Promote to admin |
| `ctx.setChatPermissions(perms, extra?)` | `setChatPermissions` | Set default permissions |
| `ctx.getChatMember(userId)` | `getChatMember` | Get member info |
| `ctx.getChatMembersCount()` | `getChatMemberCount` | Get member count |
| `ctx.approveChatJoinRequest(userId)` | `approveChatJoinRequest` | Approve join request |
| `ctx.declineChatJoinRequest(userId)` | `declineChatJoinRequest` | Decline join request |
| `ctx.leaveChat()` | `leaveChat` | Leave the current chat |

## Utility Methods

| Method | API | Description |
|--------|-----|-------------|
| `ctx.sendChatAction(action)` | `sendChatAction` | Show typing indicator, etc. |
| `ctx.setReaction(emoji)` | `setMessageReaction` | React to a message |
| `ctx.getChat()` | `getChat` | Get full chat info |
| `ctx.createChatInviteLink(extra?)` | `createChatInviteLink` | Create invite link |
| `ctx.exportChatInviteLink()` | `exportChatInviteLink` | Export primary invite link |
| `ctx.getFileLink(fileId)` | `getFile` | Get file download URL |
| `ctx.downloadFile(fileId, destPath?)` | — | Download file to disk or buffer |

## Examples

```typescript
// Send a photo with caption and inline keyboard
await ctx.replyWithPhoto('https://example.com/image.jpg', {
    caption: '<b>Product Name</b>\nPrice: $9.99',
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Buy Now', 'buy_1')]
    ])
});

// Create a poll
await ctx.replyWithPoll('Favorite color?', [
    { text: 'Red' }, { text: 'Blue' }, { text: 'Green' }
]);

// Edit a message after delay
const msg = await ctx.reply('Loading...');
setTimeout(() => ctx.editMessageText('Done!'), 2000);
```
