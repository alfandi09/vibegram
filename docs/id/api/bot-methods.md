# Metode Bot

<ApiMethodCard title="API instansi Bot" endpoint="new Bot(token)" since="1.0.0" returns="Bot" method="CLASS">
  Metode level Bot tersedia di luar satu update dan dipakai untuk kontrol launch,
  registrasi webhook, panggilan Bot API langsung, menu command, plugin, dan wrapper bisnis.
</ApiMethodCard>

<FeatureGrid title="Grup metode Bot" description="Mulai dari lifecycle, lalu lanjut ke routing dan wrapper Telegram API langsung.">
  <FeatureCard title="Lifecycle" description="Mulai polling atau webhook dan hentikan proses secara graceful." href="#metode-instance" cta="Buka lifecycle" />
  <FeatureCard title="Routing" description="Daftarkan middleware, command, listener, action, dan error handler global." href="#metode-routing" cta="Buka routing" />
  <FeatureCard title="API bisnis" description="Panggil akun bisnis, hadiah, stories, dan wrapper API langsung." href="#metode-akun-bisnis" cta="Buka bisnis" />
  <FeatureCard title="Bot API 10.0" description="Gunakan guest reply, live photo, cleanup reaction, dan pengaturan akses managed bot." href="#metode-bot-api-100" cta="Buka Bot API 10.0" />
  <FeatureCard title="Bot API 10.3" description="Ephemeral message, rich message berbasis block, dan tombol stop draft." href="#metode-bot-api-103" cta="Buka Bot API 10.3" />
</FeatureGrid>

Metode yang tersedia langsung di instansi `Bot` (tidak memerlukan Context).

## Metode Instance

| Metode                                    | Deskripsi                                           |
| ----------------------------------------- | --------------------------------------------------- |
| `bot.launch(options?)`                    | Mulai long-polling atau webhook native              |
| `bot.stop(reason?)`                       | Hentikan polling dengan graceful                    |
| `bot.handleUpdate(update)`                | Proses objek update mentah secara manual            |
| `bot.webhookCallback(secretToken?)`       | Buat handler webhook kompatibel Express             |
| `bot.callApi(method, params?)`            | Panggil metode API Telegram apa pun secara langsung |
| `bot.validateWebAppData(initData, opts?)` | Validasi initData Mini App                          |
| `bot.getMe()`                             | Ambil info bot                                      |
| `bot.setMyCommands(commands, extra?)`     | Set menu command                                    |
| `bot.getMyCommands(extra?)`               | Ambil daftar command                                |
| `bot.deleteMyCommands(extra?)`            | Hapus menu command                                  |
| `bot.setWebhook(url, extra?)`             | Daftarkan webhook ke Telegram                       |
| `bot.deleteWebhook(dropPendingUpdates?)`  | Hapus webhook aktif                                 |
| `bot.getWebhookInfo()`                    | Ambil info webhook aktif                            |
| `bot.plugin(plugin)`                      | Install plugin                                      |

## Metode Routing

Diturunkan dari `Composer`:

| Metode                         | Deskripsi                    |
| ------------------------------ | ---------------------------- |
| `bot.use(middleware)`          | Daftarkan middleware         |
| `bot.command(name, handler)`   | Tangani pesan `/command`     |
| `bot.hears(trigger, handler)`  | Cocokkan pola teks           |
| `bot.on(event, handler)`       | Dengarkan tipe update        |
| `bot.action(trigger, handler)` | Tangani klik tombol callback |
| `bot.catch(handler)`           | Global error handler         |

## Metode Akun Bisnis

Wrapper ini memakai nama payload resmi Telegram Bot API.

| Metode                                                              | API                                 |
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

## Metode Bot API 10.0 {#metode-bot-api-100}

Wrapper ini mengekspos tambahan Bot API 10.0 dengan nama payload resmi Telegram.

| Metode                                           | API                           |
| ------------------------------------------------ | ----------------------------- |
| `bot.answerGuestQuery(guestQueryId, result)`     | `answerGuestQuery`            |
| `bot.sendLivePhoto(chatId, livePhoto, photo)`    | `sendLivePhoto`               |
| `bot.getChatAdministrators(chatId, extra?)`      | `getChatAdministrators`       |
| `bot.deleteMessageReaction(chatId, messageId)`   | `deleteMessageReaction`       |
| `bot.deleteAllMessageReactions(chatId, extra?)`  | `deleteAllMessageReactions`   |
| `bot.getManagedBotAccessSettings(userId)`        | `getManagedBotAccessSettings` |
| `bot.setManagedBotAccessSettings(userId, opts)`  | `setManagedBotAccessSettings` |
| `bot.getUserPersonalChatMessages(userId, limit)` | `getUserPersonalChatMessages` |

## Metode Bot API 10.2 / 10.3 {#metode-bot-api-103}

Ephemeral message hanya terlihat oleh satu anggota grup dan bot. Bot non-admin
harus menjawab dalam 15 detik setelah callback query atau command ephemeral
masuk; `ctx.replyEphemeral()` menautkan keduanya secara otomatis.

| Metode                                                                  | API                               |
| ----------------------------------------------------------------------- | --------------------------------- |
| `ctx.replyEphemeral(text, extra?)`                                      | `sendMessage` + parameter ephemeral |
| `bot.editEphemeralMessageText(chatId, userId, id, textOrRich, extra?)`  | `editEphemeralMessageText`        |
| `bot.editEphemeralMessageMedia(chatId, userId, id, media, extra?)`      | `editEphemeralMessageMedia`       |
| `bot.editEphemeralMessageCaption(chatId, userId, id, caption?, extra?)` | `editEphemeralMessageCaption`     |
| `bot.editEphemeralMessageReplyMarkup(chatId, userId, id, markup?)`      | `editEphemeralMessageReplyMarkup` |
| `bot.deleteEphemeralMessage(chatId, userId, id)`                        | `deleteEphemeralMessage`          |
| `bot.sendMessageDraft(chatId, draftId, text, extra?)`                   | `sendMessageDraft`                |

Shortcut `ctx.editEphemeralMessage*()` dan `ctx.deleteEphemeralMessage()`
menargetkan ephemeral message saat ini, atau yang tombolnya ditekan.

```typescript
bot.setMyCommands([{ command: 'rahasia', description: 'Jawaban privat', is_ephemeral: true }]);

bot.command('rahasia', ctx => ctx.replyEphemeral('Hanya kamu yang bisa melihat ini.'));

// Stream draft dengan tombol stop (Bot API 10.3)
await ctx.replyWithDraft('Sedang berpikir...', { draft_id: 1, can_stop: true });
bot.on('stopped_message_generation', ctx => hentikanGenerasi(ctx.update.stopped_message_generation!.draft_id));
```

Rich message kini bisa disusun dari block bertipe, bukan hanya HTML atau Markdown:

```typescript
await bot.sendRichMessage(chatId, {
    blocks: [
        { type: 'heading', text: 'Catatan rilis', size: 1 },
        { type: 'expandable_blockquote', text: 'Changelog panjang...' },
        { type: 'buttons', buttons: [{ text: 'Buka', url: 'https://example.com' }] },
    ],
});
```

## Metode Bot API 10.1 {#metode-bot-api-101}

Wrapper ini mengekspos tambahan Bot API 10.1 dengan nama payload resmi Telegram.

| Metode                                                    | API                          |
| --------------------------------------------------------- | ---------------------------- |
| `bot.sendRichMessage(chatId, richMessage, extra?)`        | `sendRichMessage`            |
| `bot.sendRichMessageDraft(chatId, draftId, richMessage, extra?)` | `sendRichMessageDraft` |
| `bot.answerChatJoinRequestQuery(queryId, result)`         | `answerChatJoinRequestQuery` |
| `bot.sendChatJoinRequestWebApp(queryId, webAppUrl)`       | `sendChatJoinRequestWebApp`  |

```typescript
// Kirim rich message (sumber HTML atau Markdown — pilih salah satu)
await bot.sendRichMessage(chatId, {
    html: '<h1>Catatan rilis</h1><p>Kini dengan format <b>kaya</b>.</p>',
});

// Setujui, tolak, atau antrekan chat join request query
await bot.answerChatJoinRequestQuery(queryId, 'approve');
```

## Hadiah dan Stories

| Metode                                                               | API                       |
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

## Panggilan API Langsung

Untuk metode yang belum tersedia sebagai shortcut di Context:

```typescript
// Panggil metode API Telegram apa pun
const hasil = await bot.callApi('sendMessage', {
    chat_id: 123456,
    text: 'Halo dari callApi!',
});

// Set webhook
await bot.callApi('setWebhook', {
    url: 'https://domain.anda.com/webhook',
    secret_token: 'token-rahasia-saya',
});

// Forward pesan
await bot.callApi('forwardMessage', {
    chat_id: targetChatId,
    from_chat_id: sourceChatId,
    message_id: messageId,
});
```

## Opsi Constructor dan Launch

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

Gunakan `offsetCommit: 'received'` untuk perilaku polling historis. Gunakan
`offsetCommit: 'processed'` jika handler update yang gagal perlu dicoba ulang
oleh siklus polling berikutnya.

## Plugin API

```ts
import { Preset, createPlugin } from 'vibegram';

const greetingPlugin = createPlugin('greeting', (bot, options: { message: string }) => {
    bot.command('hello', ctx => ctx.reply(options.message));
});

bot.plugin(greetingPlugin({ message: 'Halo!' }));

const productionPreset = new Preset('production', [
    greetingPlugin({ message: 'Halo!' }),
]);

bot.plugin(productionPreset);
```

Plugin memasang diri ke surface composer yang sama dengan bot, jadi plugin bisa
mendaftarkan middleware, command, listener, dan error handler.
