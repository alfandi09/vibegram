# Referensi API — Context (ctx)

Objek `Context` (biasa disebut `ctx`) dibuat untuk setiap update yang diterima bot. Objek ini berisi semua informasi tentang update tersebut dan menyediakan metode shortcut untuk berinteraksi dengan pengguna.

## Properti

| Properti       | Tipe                       | Deskripsi                                           |
| -------------- | -------------------------- | --------------------------------------------------- |
| `ctx.update`   | `Update`                   | Objek update mentah dari Telegram                   |
| `ctx.message`  | `Message`                  | Pesan dari update (jika ada)                        |
| `ctx.chat`     | `Chat`                     | Chat tempat update terjadi                          |
| `ctx.from`     | `User`                     | Pengguna yang mengirim update                       |
| `ctx.match`    | `RegExpMatchArray \| null` | Hasil regex dari `hears()` / `action()`             |
| `ctx.command`  | `{ name, args }`           | Data command dari `command()`                       |
| `ctx.telegram` | `TelegramClient`           | Client Telegram API langsung yang scoped per update |
| `ctx.session`  | —                          | Data session (jika middleware session dipasang)     |
| `ctx.scene`    | —                          | Kontrol scene (jika middleware stage dipasang)      |
| `ctx.wizard`   | —                          | Kontrol wizard (jika wizard dipasang)               |

## Metode Pesan & Media

### Teks

```typescript
await ctx.reply('Halo!');
await ctx.replyWithHTML('<b>Tebal</b> dan <i>miring</i>');
await ctx.replyWithMarkdown('**Tebal** dan _miring_');
```

### Media

```typescript
await ctx.replyWithPhoto('file_id_atau_url');
await ctx.replyWithVideo('file_id');
await ctx.replyWithAudio('file_id');
await ctx.replyWithDocument('file_id');
await ctx.replyWithVoice('file_id');
await ctx.replyWithSticker('file_id');
await ctx.replyWithAnimation('file_id'); // GIF
await ctx.replyWithDice('🎲'); // Dadu animasi
```

### Pesan Interaktif

```typescript
// Poll/Kuis
await ctx.replyWithPoll('Pertanyaan?', ['Pilihan A', 'Pilihan B']);
await ctx.replyWithQuiz('Ibu kota Indonesia?', ['Jakarta', 'Surabaya', 'Bandung'], {
    correct_option_id: 0,
});

// Venue & Lokasi
await ctx.replyWithVenue(latitude, longitude, 'Nama Tempat', 'Alamat');
await ctx.replyWithLocation(latitude, longitude);

// Kontak
await ctx.replyWithContact('08123456789', 'Nama', 'Depan');
```

## Metode Edit

```typescript
// Edit teks pesan
await ctx.editMessageText('Teks baru');
await ctx.editMessageText('Teks baru', { parse_mode: 'HTML' });

// Edit keyboard
await ctx.editMessageReplyMarkup(Markup.inlineKeyboard([...]));

// Edit caption media
await ctx.editMessageCaption('Caption baru');

// Hapus pesan
await ctx.deleteMessage();
await ctx.deleteMessage(messageId); // hapus pesan spesifik
```

## Callback Query

```typescript
// Jawab callback query (wajib untuk menghentikan loading indicator)
await ctx.answerCbQuery();
await ctx.answerCbQuery('Berhasil! ✅', false); // teks tanpa alert
await ctx.answerCbQuery('Perhatian!', true); // tampilkan sebagai alert
```

## Inline Query

```typescript
await ctx.answerInlineQuery(results, {
    cache_time: 300,
    is_personal: true,
});
```

## Aksi Chat

```typescript
// Tampilkan indikator aksi (mengetik, merekam, dll)
await ctx.sendChatAction('typing');
await ctx.sendChatAction('upload_photo');
await ctx.sendChatAction('record_video');
```

## Reaksi

```typescript
// Tambahkan reaksi emoji ke pesan
await ctx.setReaction('👍');
await ctx.setReaction('🔥', true); // ukuran besar
```

## Forum Topic

```typescript
await ctx.createForumTopic('Topik Baru', { icon_color: 0x6fb9f0 });
await ctx.closeForumTopic(messageThreadId);
await ctx.reopenForumTopic(messageThreadId);
await ctx.deleteForumTopic(messageThreadId);
await ctx.editGeneralForumTopic('Diskusi Umum');
```

## Administrasi Grup

```typescript
await ctx.banChatMember(userId);
await ctx.banChatMember(userId, { until_date: timestamp, revoke_messages: true });

await ctx.unbanChatMember(userId);
await ctx.restrictChatMember(userId, permissions);
await ctx.promoteChatMember(userId, { can_delete_messages: true });
await ctx.setChatAdministratorCustomTitle(userId, 'Moderator');
await ctx.setChatPermissions({ can_send_messages: true });
await ctx.kickChatMember = ctx.banChatMember; // alias

await ctx.getChatMember(userId);
await ctx.getChatMembersCount();
await ctx.getChatAdministrators();
await ctx.leaveChat();
await ctx.approveChatJoinRequest(userId);
await ctx.declineChatJoinRequest(userId);
```

## Undangan & Info Chat

```typescript
const link = await ctx.createChatInviteLink({
    name: 'Link VIP',
    expire_date: timestamp,
    member_limit: 50,
});

await ctx.exportChatInviteLink();
await ctx.getChat(); // info chat lengkap
await ctx.getUserChatBoosts(userId);
```

## Star & Hadiah

```typescript
await ctx.getAvailableGifts();
await ctx.sendGift(userId, giftId, { text: 'Selamat!' });
await ctx.sendGiftToChat('@channel', giftId);
await ctx.getUserGifts(userId, { limit: 10 });
await ctx.getBusinessAccountGifts(businessConnectionId, { limit: 10 });
await ctx.getStarBalance();
await ctx.refundStarPayment(userId, chargeId);
await ctx.getStarTransactions();
```

## Akses API Langsung

```typescript
await ctx.telegram.callApi('sendChatAction', {
    chat_id: ctx.chat!.id,
    action: 'typing',
});
```

## Verifikasi

```typescript
await ctx.verifyUser(userId, { custom_description: 'Anggota terverifikasi' });
await ctx.removeUserVerification(userId);
await ctx.verifyChat(chatId);
await ctx.removeChatVerification(chatId);
```

## File

```typescript
// Dapatkan URL unduhan file
const url = await ctx.getFileLink(fileId);

// Unduh langsung ke buffer atau file
const buffer = await ctx.downloadFile(fileId);
await ctx.downloadFile(fileId, './gambar.jpg'); // simpan ke disk
```
