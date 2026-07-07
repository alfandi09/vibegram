# Tipe TypeScript

VibeGram mengekspor deklarasi TypeScript untuk objek utama Telegram Bot API
10.1, helper framework, opsi middleware, dan class error.

```ts
import type { Update, Message, User, Chat, Context } from 'vibegram';
```

## Tipe Core

| Tipe | Deskripsi |
| --- | --- |
| `Update` | Update masuk dari Telegram. |
| `Message` | Payload pesan. |
| `User` | User Telegram. |
| `Chat` | Identitas chat ringkas dari update. |
| `ChatFullInfo` | Metadata chat lengkap dari `getChat`. |
| `CallbackQuery` | Callback tombol inline. |
| `InlineQuery` | Query inline mode. |
| `Context<S>` | Context handler per update, opsional diketik dengan data session. |

## Tipe Media

| Tipe | Deskripsi |
| --- | --- |
| `PhotoSize` | Metadata foto dengan dimensi. |
| `Audio` | File audio. |
| `Document` | File umum. |
| `Video` | File video. |
| `Voice` | Voice note. |
| `VideoNote` | Video note bulat. |
| `Animation` | GIF atau animasi H.264. |
| `LivePhoto` | Payload live photo Bot API 10.0. |
| `Sticker` | Metadata sticker. |
| `Contact` | Kontak yang dibagikan. |
| `Location` | Koordinat geografis. |

## Tipe Interaktif

| Tipe | Deskripsi |
| --- | --- |
| `Poll` | Payload poll atau quiz. |
| `PollOption` | Satu opsi poll. |
| `PollMedia` | Media Bot API 10.0 yang melekat ke poll. |
| `Dice` | Hasil dice animasi. |
| `Venue` | Venue dengan lokasi. |
| `Game` | Payload game Telegram. |
| `WebAppData` | Data dari Mini App. |

## Tipe Keyboard

| Tipe | Deskripsi |
| --- | --- |
| `ReplyMarkup` | Union payload reply markup yang didukung. |
| `InlineKeyboardMarkup` | Layout inline keyboard. |
| `InlineKeyboardButton` | Tombol inline keyboard. |
| `ReplyKeyboardMarkup` | Layout reply keyboard native. |
| `KeyboardButton` | Tombol reply keyboard native. |
| `ReplyKeyboardRemove` | Payload hapus keyboard. |
| `ForceReply` | Payload force reply. |

## Tipe Entity

| Tipe | Deskripsi |
| --- | --- |
| `MessageEntity` | Entity teks seperti command, link, bold, code, spoiler, atau blockquote. |

String entity yang didukung mencakup `mention`, `hashtag`, `bot_command`,
`url`, `email`, `phone_number`, `bold`, `italic`, `underline`,
`strikethrough`, `spoiler`, `code`, `pre`, `text_link`, `text_mention`,
`custom_emoji`, `blockquote`, `expandable_blockquote`, dan `date_time`.

## Tipe Update

| Tipe | Deskripsi |
| --- | --- |
| `ChatMemberUpdated` | Perubahan status member. |
| `ChatJoinRequest` | Request join chat. |
| `ShippingQuery` | Query shipping pembayaran. |
| `PreCheckoutQuery` | Query pre-checkout pembayaran. |
| `ChatBoostUpdated` | Event chat boost. |
| `ChatBoostRemoved` | Event chat boost dihapus. |
| `PaidMediaPurchased` | Event pembelian paid media. |

## Tipe Extra

Tipe extra mendeskripsikan parameter opsional untuk shortcut method.

```ts
import type {
    ExtraReplyMessage,
    ExtraMedia,
    ExtraEditMessage,
    ExtraPoll,
    ExtraBanMember,
    ExtraRestrictMember,
    ExtraPromoteMember,
    ExtraInviteLink,
} from 'vibegram';
```

## Tipe State dan Helper

```ts
import type {
    BotOptions,
    BotLaunchOptions,
    Middleware,
    NextFunction,
    SessionStore,
    RateLimitStore,
    UpdateDedupeStore,
} from 'vibegram';
```

Gunakan tipe ini saat menulis middleware, plugin, store, atau instance bot yang
strongly typed.

## Tipe Bot API 10.0

| Tipe | Deskripsi |
| --- | --- |
| `SentGuestMessage` | Hasil dari `answerGuestQuery`. |
| `BotAccessSettings` | Pengaturan akses managed bot. |
| `LivePhoto` | Objek live photo di message. |
| `InputMediaLivePhoto` | Payload input media live photo. |
| `PollMedia` | Media untuk poll dan explanation poll. |
| `DeleteMessageReactionOptions` | Opsi menghapus satu reaction message. |
| `DeleteAllMessageReactionsOptions` | Opsi menghapus reaction terbaru. |
| `SendLivePhotoOptions` | Opsi tambahan untuk `sendLivePhoto`. |

## Tipe Bot API 10.1

### Rich Messages

| Tipe | Deskripsi |
| --- | --- |
| `RichMessage` | Pesan rich (`blocks` + `is_rtl` opsional). |
| `InputRichMessage` | Rich message yang dikirim; pakai tepat satu dari `html` atau `markdown`. |
| `InputRichMessageContent` | Konten rich message untuk hasil inline query. |
| `RichText` | String biasa, array `RichText`, atau elemen `RichText*`. |
| `RichBlock` | Union block rich seperti paragraph, heading, table, dan photo. |
| `RichBlockCaption` | Caption (`text` + `credit` opsional) untuk block media. |
| `RichBlockTableCell` | Sel pada `RichBlockTable`. |
| `RichBlockListItem` | Item pada `RichBlockList`. |

Tipe inline `RichText*` dan block `RichBlock*` diekspor satu per satu untuk
typing yang presisi.

### Join Request Queries dan Polls

| Tipe | Deskripsi |
| --- | --- |
| `ChatJoinRequestQueryResult` | Hasil `'approve' \| 'decline' \| 'queue'` untuk `answerChatJoinRequestQuery`. |
| `Link` | Objek HTTP link (`url`). |
| `InputMediaLink` | Media link yang bisa dipakai sebagai media opsi poll. |

Field baru pada tipe lama mencakup `User.supports_join_request_queries`,
`ChatFullInfo.guard_bot`, `ChatJoinRequest.query_id`, dan
`Message.rich_message`.

## Interface Pagination

```ts
import type { PaginationItem, PaginationOptions } from 'vibegram';

const item: PaginationItem = {
    text: 'Produk',
    callback_data: 'product:1',
};
```

`PaginationOptions` mengatur nomor halaman, ukuran halaman, callback data
navigasi, pola label halaman opsional, dan kolom grid opsional.

## Interface Session

```ts
import type { SessionStore } from 'vibegram';

class RedisSessionStore implements SessionStore {
    async get(key: string) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : undefined;
    }

    async set(key: string, value: unknown) {
        await redis.set(key, JSON.stringify(value));
    }

    async delete(key: string) {
        await redis.del(key);
    }
}
```

Gunakan `MemorySessionStore` untuk storage in-memory lokal atau implementasikan
`SessionStore` untuk Redis, SQL, atau store eksternal lain.

## Session Bertipe

```ts
type MySession = {
    count: number;
    language: string;
};

bot.use(
    session<MySession>({
        initial: () => ({ count: 0, language: 'id' }),
    })
);
```

Typing middleware session membuat `ctx.session` strongly typed di handler
berikutnya.

## Extending Context

```ts
import type { Context } from 'vibegram';

interface AppContext extends Context<MySession> {
    user?: { id: string; role: 'admin' | 'member' };
}

const bot = new Bot<AppContext>(process.env.BOT_TOKEN!);
```

Gunakan tipe context kustom saat middleware menempelkan data aplikasi sendiri.

## Tipe Error

```ts
import {
    ConversationTimeoutError,
    InvalidTokenError,
    NetworkError,
    RateLimitError,
    TelegramApiError,
    VibeGramError,
    WebAppValidationError,
} from 'vibegram';
```

Catch subclass spesifik saat perilaku recovery berbeda per kategori error.
