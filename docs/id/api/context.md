# Context (ctx)

<ApiMethodCard title="Shortcut Context" endpoint="ctx per update" since="1.0.0" returns="Context" method="API">
  Context dibuat untuk setiap update dan membungkus Telegram client scoped, field update,
  state session, helper scene/wizard, dan shortcut reply.
</ApiMethodCard>

<FeatureGrid title="Permukaan Context" description="Gunakan halaman ini sebagai peta metode per-update yang paling sering dipakai.">
  <FeatureCard title="Pesan" description="Kirim teks, HTML, Markdown, draft, dan media." href="#pesan" />
  <FeatureCard title="Interaksi" description="Jawab callback query, inline query, pembayaran, dan chat action." href="#callback-query" />
  <FeatureCard title="Administrasi" description="Kelola member, permission, invite link, gift, dan Stars." href="#administrasi-grup" />
</FeatureGrid>

`Context` dibuat untuk setiap update masuk. Objek ini mengekspos update mentah,
getter praktis yang dicache, akses Telegram API scoped, dan shortcut untuk
operasi Bot API yang umum.

## Properti

| Properti | Tipe | Deskripsi |
| --- | --- | --- |
| `ctx.update` | `Update` | Update mentah dari Telegram. |
| `ctx.updateType` | `string` | Field update utama, tanpa `update_id`. |
| `ctx.message` | `Message \| undefined` | Payload pesan dari message, edited message, channel post, atau business message. |
| `ctx.chat` | `Chat \| undefined` | Chat tempat update terjadi. |
| `ctx.from` | `User \| undefined` | User yang memicu update. |
| `ctx.businessConnectionId` | `string \| undefined` | Business connection ID jika ada. |
| `ctx.match` | `RegExpMatchArray \| null \| undefined` | Hasil regex dari `hears()` atau `action()`. |
| `ctx.command` | `{ name: string; args: string[] } \| undefined` | Data command dari `command()`. |
| `ctx.client` | `TelegramClient` | Telegram client scoped untuk update ini. |
| `ctx.telegram` | `TelegramClient` | Alias untuk `ctx.client`. |
| `ctx.session` | `S` | Data session jika middleware `session()` dipasang. |
| `ctx.scene` | `object \| undefined` | Kontrol scene jika middleware scene dipasang. |
| `ctx.wizard` | `object \| undefined` | Kontrol wizard jika middleware wizard dipasang. |
| `ctx.i18n` | `object \| undefined` | Helper i18n jika `I18n.middleware()` dipasang. |

## Pesan

```ts
await ctx.reply('Halo!');
await ctx.replyQuote('Membalas pesan kamu.');
await ctx.replyWithHTML('<b>Tebal</b>');
await ctx.replyWithMarkdown('*Tebal*');
await ctx.replyWithMarkdownV2('*Tebal*');
await ctx.replyWithDraft('Teks draft awal');
```

Gunakan `Markup.escapeHTML()`, `Markup.escapeMarkdownV2()`, atau
`Markup.escapeMarkdown()` sebelum menyisipkan nilai tidak tepercaya ke pesan
berformat.

## Media

```ts
await ctx.replyWithPhoto('file_id_atau_url');
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

Argumen file bisa berupa file ID, URL, buffer, stream, atau bentuk `InputFile`
yang didukung.

## Pesan Interaktif

```ts
await ctx.replyWithPoll('Ship it?', [{ text: 'Ya' }, { text: 'Perlu review' }]);
await ctx.stopPoll();
await ctx.replyWithDice();
await ctx.replyWithGame('game_short_name');
await ctx.replyWithLocation(latitude, longitude);
await ctx.replyWithVenue(latitude, longitude, 'Nama tempat', 'Alamat');
await ctx.replyWithContact('+6281234567890', 'Ada');
await ctx.replyWithChecklist('Tugas rilis', [{ text: 'Jalankan test' }]);
await ctx.replyWithRichMessage({
    html: '<h2>Selamat datang</h2><p>Ini pesan <b>rich</b>.</p>',
});
```

`replyWithRichMessage()` menerima tepat satu format source rich yang didukung
oleh payload Telegram Bot API saat ini.

## Metode Edit

```ts
await ctx.editMessageText('Teks baru');
await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([[Markup.button.callback('OK', 'ok')]]));
await ctx.editMessageCaption('Caption baru');
await ctx.editMessageMedia({ type: 'photo', media: 'new_file_id' });
await ctx.editMessageLiveLocation(latitude, longitude);
await ctx.stopMessageLiveLocation();
await ctx.editMessageChecklist({
    title: 'Checklist baru',
    tasks: [{ text: 'Verifikasi docs' }],
});
await ctx.deleteMessage();
await ctx.deleteMessages([101, 102]);
```

Helper edit menargetkan pesan saat ini atau pesan callback query jika tersedia.
Helper akan melempar error jika identitas chat/message yang diperlukan tidak
ada.

## Callback Query

```ts
await ctx.answerCbQuery();
await ctx.answerCbQuery('Tersimpan');
await ctx.answerCbQuery('Perlu perhatian', true);
```

Jawab callback query untuk menghentikan loading indicator Telegram setelah klik
tombol inline.

## Inline Query

```ts
await ctx.answerInlineQuery(results, {
    cache_time: 300,
    is_personal: true,
});
```

Helper ini hanya valid di update `inline_query`.

## Chat Actions

```ts
await ctx.sendChatAction('typing');
await ctx.sendChatAction('upload_photo');
await ctx.sendChatAction('record_video');
```

Chat action adalah indikator sementara di client. Ini tidak tersimpan sebagai
pesan.

## Reactions

```ts
await ctx.setReaction('👍');
await ctx.setReaction([{ type: 'emoji', emoji: '🔥' }], true);
await ctx.deleteMessageReaction(messageId, { user_id: userId });
await ctx.deleteAllMessageReactions({ actor_chat_id: channelId });
```

Helper reaksi membutuhkan target chat dan message.

## Forum Topics

```ts
await ctx.createForumTopic('Topik baru', { icon_color: 0x6fb9f0 });
await ctx.editForumTopic(messageThreadId, { name: 'Topik diperbarui' });
await ctx.closeForumTopic(messageThreadId);
await ctx.reopenForumTopic(messageThreadId);
await ctx.deleteForumTopic(messageThreadId);
await ctx.editGeneralForumTopic('Diskusi umum');
await ctx.getForumTopicIconStickers();
```

Helper forum topic membutuhkan kemampuan supergroup/forum dari Telegram.

## Administrasi Grup

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

Telegram mengharuskan bot memiliki admin rights yang sesuai sebelum metode ini
bisa berhasil.

## Undangan dan Info Chat

```ts
const invite = await ctx.createChatInviteLink({
    name: 'VIP',
    member_limit: 50,
});

await ctx.exportChatInviteLink();
await ctx.createChatSubscriptionInviteLink(2_592_000, 100, { name: 'Grup berbayar' });
await ctx.getChat();
await ctx.getUserChatBoosts(userId);
```

Gunakan `ctx.telegram.callApi()` untuk metode Bot API langka yang belum punya
shortcut.

## Stars dan Gift

```ts
await ctx.getAvailableGifts();
await ctx.sendGift(userId, giftId, { text: 'Selamat!' });
await ctx.sendGiftToChat('@channel', giftId);
await ctx.getUserGifts(userId, { limit: 10 });
await ctx.getBusinessAccountGifts(businessConnectionId, { limit: 10 });
await ctx.getMyStarBalance();
await ctx.refundStarPayment(userId, chargeId);
await ctx.getStarTransactions({ limit: 10 });
```

`ctx.getStarBalance()` tetap ada sebagai alias kompatibilitas. Pakai
`ctx.getMyStarBalance()` untuk kode baru.

## Akses API Langsung

```ts
await ctx.telegram.callApi('sendChatAction', {
    chat_id: ctx.chat!.id,
    action: 'typing',
});
```

Client scoped dibuat per update, jadi middleware bisa mendekorasinya tanpa
membocorkan state ke update lain.

## Verifikasi

```ts
await ctx.verifyUser(userId, { custom_description: 'Member terverifikasi' });
await ctx.removeUserVerification(userId);
await ctx.verifyChat(chatId);
await ctx.removeChatVerification(chatId);
```

Metode verifikasi merepresentasikan organisasi di balik bot.

## File

```ts
const url = await ctx.getFileLink(fileId);

const buffer = await ctx.downloadFile(fileId);
await ctx.downloadFile(fileId, './image.jpg');
```

Tanpa `destPath`, `downloadFile()` resolve dengan `Buffer`. Dengan `destPath`,
file ditulis ke disk dan resolve setelah write selesai.

## Contoh

```ts
await ctx.replyWithPhoto('https://contoh.com/image.jpg', {
    caption: '<b>Produk</b>\nHarga: $9.99',
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Beli sekarang', 'buy_1')]]),
});

await ctx.replyWithInvoice(
    'Keanggotaan Pro',
    'Akses 30 hari',
    'pro_30d',
    'USD',
    [{ label: 'Keanggotaan Pro', amount: 999 }],
    { provider_token: process.env.PAYMENT_PROVIDER_TOKEN! }
);
```
