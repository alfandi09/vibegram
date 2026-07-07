# Context (ctx)

<ApiMethodCard title="Context shortcuts" endpoint="per-update ctx" since="1.0.0" returns="Context" method="API">
  Context is created for every update and wraps the scoped Telegram client, parsed update
  fields, session state, scene/wizard helpers, and reply shortcuts.
</ApiMethodCard>

<FeatureGrid title="Context surfaces" description="Use this page as a map of the most common per-update methods.">
  <FeatureCard title="Messages" description="Send text, HTML, Markdown, drafts, and media." href="#messages" />
  <FeatureCard title="Interactions" description="Answer callback queries, inline queries, payments, and chat actions." href="#callback-query" />
  <FeatureCard title="Administration" description="Manage members, permissions, invite links, gifts, and Stars." href="#group-administration" />
</FeatureGrid>

`Context` is created for every incoming update. It exposes the raw update,
cached convenience getters, scoped Telegram API access, and shortcuts for common
Bot API operations.

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `ctx.update` | `Update` | Raw Telegram update. |
| `ctx.updateType` | `string` | Primary update field, excluding `update_id`. |
| `ctx.message` | `Message \| undefined` | Message-like payload from message, edited message, channel post, or business message updates. |
| `ctx.chat` | `Chat \| undefined` | Chat where the update happened. |
| `ctx.from` | `User \| undefined` | User who triggered the update. |
| `ctx.businessConnectionId` | `string \| undefined` | Business connection ID when present. |
| `ctx.match` | `RegExpMatchArray \| null \| undefined` | Regex result from `hears()` or `action()`. |
| `ctx.command` | `{ name: string; args: string[] } \| undefined` | Parsed command data from `command()`. |
| `ctx.client` | `TelegramClient` | Scoped Telegram client for this update. |
| `ctx.telegram` | `TelegramClient` | Alias for `ctx.client`. |
| `ctx.session` | `S` | Session data when `session()` middleware is installed. |
| `ctx.scene` | `object \| undefined` | Scene controls when scene middleware is installed. |
| `ctx.wizard` | `object \| undefined` | Wizard controls when wizard middleware is installed. |
| `ctx.i18n` | `object \| undefined` | I18n helper when `I18n.middleware()` is installed. |

## Messages

```ts
await ctx.reply('Hello!');
await ctx.replyQuote('Replying to your message.');
await ctx.replyWithHTML('<b>Bold</b>');
await ctx.replyWithMarkdown('*Bold*');
await ctx.replyWithMarkdownV2('*Bold*');
await ctx.replyWithDraft('Pre-filled draft text');
```

Use `Markup.escapeHTML()`, `Markup.escapeMarkdownV2()`, or
`Markup.escapeMarkdown()` before interpolating untrusted values into formatted
messages.

## Media

```ts
await ctx.replyWithPhoto('file_id_or_url');
await ctx.replyWithLivePhoto('live_photo_file_id', 'photo_file_id', {
    caption: 'Live photo',
});
await ctx.replyWithVideo('file_id');
await ctx.replyWithAudio('file_id');
await ctx.replyWithDocument('file_id');
await ctx.replyWithVoice('file_id');
await ctx.replyWithVideoNote('file_id');
await ctx.replyWithAnimation('file_id');
await ctx.replyWithSticker('file_id');
await ctx.replyWithMediaGroup([{ type: 'photo', media: 'file_id' }]);
await ctx.replyWithPaidMedia(15, [{ type: 'photo', media: 'file_id' }]);
```

File arguments can be file IDs, URLs, buffers, streams, or the supported
`InputFile` shapes.

## Interactive Messages

```ts
await ctx.replyWithPoll('Ship it?', [{ text: 'Yes' }, { text: 'Needs review' }]);
await ctx.stopPoll();
await ctx.replyWithDice();
await ctx.replyWithGame('game_short_name');
await ctx.replyWithLocation(latitude, longitude);
await ctx.replyWithVenue(latitude, longitude, 'Venue name', 'Address');
await ctx.replyWithContact('+15551234567', 'Ada');
await ctx.replyWithChecklist('Launch tasks', [{ text: 'Run tests' }]);
await ctx.replyWithRichMessage({
    html: '<h2>Welcome</h2><p>This is a <b>rich</b> message.</p>',
});
```

`replyWithRichMessage()` accepts exactly one rich source format supported by the
current Telegram Bot API payload.

## Edit Methods

```ts
await ctx.editMessageText('Updated text');
await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[Markup.button.callback('OK', 'ok')]]));
await ctx.editMessageCaption('Updated caption');
await ctx.editMessageMedia({ type: 'photo', media: 'new_file_id' });
await ctx.editMessageLiveLocation(latitude, longitude);
await ctx.stopMessageLiveLocation();
await ctx.editMessageChecklist({
    title: 'Updated checklist',
    tasks: [{ text: 'Verify docs' }],
});
await ctx.deleteMessage();
await ctx.deleteMessages([101, 102]);
```

Edit helpers target the current message or the callback query message when
possible. They throw if the required chat/message identifiers are unavailable.

## Callback Query

```ts
await ctx.answerCbQuery();
await ctx.answerCbQuery('Saved');
await ctx.answerCbQuery('Requires attention', true);
```

Answer callback queries to stop Telegram's loading indicator after inline button
clicks.

## Inline Query

```ts
await ctx.answerInlineQuery(results, {
    cache_time: 300,
    is_personal: true,
});
```

This helper is only valid inside `inline_query` updates.

## Chat Actions

```ts
await ctx.sendChatAction('typing');
await ctx.sendChatAction('upload_photo');
await ctx.sendChatAction('record_video');
```

Chat actions are temporary client indicators. They are not stored as messages.

## Reactions

```ts
await ctx.setReaction('👍');
await ctx.setReaction([{ type: 'emoji', emoji: '🔥' }], true);
await ctx.deleteMessageReaction(messageId, { user_id: userId });
await ctx.deleteAllMessageReactions({ actor_chat_id: channelId });
```

Reaction helpers require a chat and message target.

## Forum Topics

```ts
await ctx.createForumTopic('New topic', { icon_color: 0x6fb9f0 });
await ctx.editForumTopic(messageThreadId, { name: 'Updated topic' });
await ctx.closeForumTopic(messageThreadId);
await ctx.reopenForumTopic(messageThreadId);
await ctx.deleteForumTopic(messageThreadId);
await ctx.editGeneralForumTopic('General discussion');
await ctx.getForumTopicIconStickers();
```

Forum topic helpers require supergroup/forum capabilities from Telegram.

## Group Administration

```ts
await ctx.banChatMember(userId, { revoke_messages: true });
await ctx.unbanChatMember(userId);
await ctx.restrictChatMember(userId, permissions);
await ctx.promoteChatMember(userId, { can_delete_messages: true });
await ctx.setChatAdministratorCustomTitle(userId, 'Moderator');
await ctx.setChatPermissions({ can_send_messages: true });
await ctx.getChatMember(userId);
await ctx.getChatMembersCount();
await ctx.getChatAdministrators({ return_bots: true });
await ctx.approveChatJoinRequest(userId);
await ctx.declineChatJoinRequest(userId);
await ctx.leaveChat();
```

Telegram requires the bot to have the corresponding admin rights before these
methods can succeed.

## Invites and Chat Info

```ts
const invite = await ctx.createChatInviteLink({
    name: 'VIP',
    member_limit: 50,
});

await ctx.exportChatInviteLink();
await ctx.createChatSubscriptionInviteLink(2_592_000, 100, { name: 'Paid group' });
await ctx.getChat();
await ctx.getUserChatBoosts(userId);
```

Use direct `ctx.telegram.callApi()` for rare Bot API methods that do not yet
have a shortcut.

## Stars and Gifts

```ts
await ctx.getAvailableGifts();
await ctx.sendGift(userId, giftId, { text: 'Congrats!' });
await ctx.sendGiftToChat('@channel', giftId);
await ctx.getUserGifts(userId, { limit: 10 });
await ctx.getBusinessAccountGifts(businessConnectionId, { limit: 10 });
await ctx.getMyStarBalance();
await ctx.refundStarPayment(userId, chargeId);
await ctx.getStarTransactions({ limit: 10 });
```

`ctx.getStarBalance()` is kept as a compatibility alias. Prefer
`ctx.getMyStarBalance()` in new code.

## Direct API Access

```ts
await ctx.telegram.callApi('sendChatAction', {
    chat_id: ctx.chat!.id,
    action: 'typing',
});
```

The scoped client is created per update, so middleware can decorate it without
leaking state into other updates.

## Verification

```ts
await ctx.verifyUser(userId, { custom_description: 'Verified member' });
await ctx.removeUserVerification(userId);
await ctx.verifyChat(chatId);
await ctx.removeChatVerification(chatId);
```

Verification methods represent the organization behind the bot.

## Files

```ts
const url = await ctx.getFileLink(fileId);

const buffer = await ctx.downloadFile(fileId);
await ctx.downloadFile(fileId, './image.jpg');
```

Without `destPath`, `downloadFile()` resolves with a `Buffer`. With `destPath`,
it writes the file and resolves when the write completes.

## Examples

```ts
await ctx.replyWithPhoto('https://example.com/image.jpg', {
    caption: '<b>Product</b>\nPrice: $9.99',
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Buy now', 'buy_1')]]),
});

await ctx.replyWithInvoice(
    'Pro Membership',
    '30-day access',
    'pro_30d',
    'USD',
    [{ label: 'Pro Membership', amount: 999 }],
    { provider_token: process.env.PAYMENT_PROVIDER_TOKEN! }
);
```
