# Tipe TypeScript

VibeGram menyertakan 32+ interface TypeScript yang mencakup semua objek Bot API Telegram v9.6 utama.

## Tipe Update & Pesan

```typescript
import type {
    Update,
    Message,
    Chat,
    ChatFullInfo,
    User,
    CallbackQuery,
    InlineQuery,
    ShippingQuery,
    PreCheckoutQuery,
} from 'vibegram';
```

`Chat` berisi identitas ringkas dari update. Metadata lengkap seperti `permissions`,
`description`, `photo`, dan `accepted_gift_types` tersedia lewat `ChatFullInfo`, misalnya
dari `ctx.getChat()`.

## Tipe Keyboard & Markup

```typescript
import type {
    ReplyMarkup,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    ForceReply,
    KeyboardButton,
    InlineKeyboardButton,
} from 'vibegram';
```

## Tipe Extra (Parameter Tambahan)

Digunakan untuk mengetik parameter tambahan pada metode API:

```typescript
import type {
    ExtraReplyMessage, // Opsi tambahan untuk sendMessage
    ExtraMedia, // Opsi tambahan untuk sendPhoto/Video/dll
    ExtraEditMessage, // Opsi tambahan untuk editMessageText
    ExtraPoll, // Opsi tambahan untuk sendPoll
    ExtraBanMember, // Opsi tambahan untuk banChatMember
    ExtraRestrictMember, // Opsi tambahan untuk restrictChatMember
    ExtraPromoteMember, // Opsi tambahan untuk promoteChatMember
    ExtraInviteLink, // Opsi tambahan untuk createChatInviteLink
} from 'vibegram';
```

## Tipe State

```typescript
import type {
    ChatPermissions, // Izin anggota chat
    ChatMember, // Status anggota (administrator, member, dll)
    PhotoSize, // Metadata dimensi foto
    File, // Objek file Telegram
} from 'vibegram';
```

## Interface Pagination

```typescript
import type { PaginationItem, PaginationOptions } from 'vibegram';

// PaginationItem
interface PaginationItem {
    text: string;
    callback_data: string;
}

// PaginationOptions
interface PaginationOptions {
    currentPage: number;
    itemsPerPage: number;
    actionNext: string;
    actionPrev: string;
    pageIndicatorPattern?: string;
    columns?: number;
}
```

## Interface Session

```typescript
import type { SessionStore } from 'vibegram';

// Implementasikan untuk session store kustom
interface SessionStore<T = any> {
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
}
```

## Menggunakan Generic untuk Session

```typescript
interface DataSesi {
    hitungan: number;
    bahasa: string;
    keranjang: string[];
    terakhirDilihat?: Date;
}

// Session bertipe penuh
bot.use(
    session<DataSesi>({
        initial: () => ({
            hitungan: 0,
            bahasa: 'id',
            keranjang: [],
        }),
    })
);

// ctx.session.hitungan dikenali sebagai `number`
// ctx.session.keranjang dikenali sebagai `string[]`
```

## Extending Context

Tambahkan properti kustom ke Context:

```typescript
import type { Context } from 'vibegram';

// Definisikan interface Context kustom
interface ContextBot extends Context {
    session: DataSesi;
    pengguna?: PenggunaDariDB;
}

const bot = new Bot<ContextBot>(process.env.BOT_TOKEN!);

// Middleware untuk melampirkan data pengguna
bot.use(async (ctx, next) => {
    if (ctx.from?.id) {
        ctx.pengguna = await db.pengguna.findById(ctx.from.id);
    }
    await next();
});
```

## Tipe Error

```typescript
import {
    VibeGramError,
    TelegramApiError,
    NetworkError,
    RateLimitError,
    InvalidTokenError,
    WebAppValidationError,
    ConversationTimeoutError,
} from 'vibegram';
```
