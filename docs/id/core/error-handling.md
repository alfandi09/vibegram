# Penanganan Error

VibeGram menyediakan hierarki kelas error khusus yang memungkinkan penanganan error yang presisi menggunakan `instanceof`.

## Hierarki Error

```
Error
└── VibeGramError (base semua error vibegram)
    ├── TelegramApiError   — Error dari API Telegram (kode 4xx/5xx)
    ├── NetworkError       — Kegagalan koneksi/timeout
    ├── RateLimitError     — HTTP 429 dengan waktu retry
    ├── InvalidTokenError  — Token bot tidak valid
    ├── WebAppValidationError — Validasi Mini App gagal
    └── ConversationTimeoutError — Percakapan kedaluwarsa
```

## Global Error Handler

```typescript
bot.catch((err, ctx) => {
    console.error('Error:', err.message);
    ctx.reply('Terjadi kesalahan. Coba lagi nanti. 🔧');
});
```

## Penanganan Error Bertipe

```typescript
import {
    VibeGramError,
    TelegramApiError,
    NetworkError,
    RateLimitError,
    InvalidTokenError,
    ConversationTimeoutError
} from 'vibegram';

bot.catch(async (err, ctx) => {
    if (err instanceof TelegramApiError) {
        // Error dari API Telegram
        console.error(`API Error ${err.errorCode}: ${err.description}`);

        if (err.errorCode === 403) {
            // Bot diblokir oleh pengguna
            console.log(`Pengguna ${ctx.from?.id} memblokir bot`);
        } else if (err.errorCode === 400) {
            await ctx.reply('Permintaan tidak valid.');
        }

    } else if (err instanceof RateLimitError) {
        // Terlalu banyak request — coba lagi nanti
        console.warn(`Rate limited. Coba lagi dalam ${err.retryAfter} detik`);

    } else if (err instanceof NetworkError) {
        // Masalah koneksi
        console.error('Koneksi gagal:', err.originalError?.message);

    } else if (err instanceof ConversationTimeoutError) {
        // Percakapan kedaluwarsa
        console.log(`Percakapan chat ${err.chatId} kedaluwarsa`);

    } else if (err instanceof VibeGramError) {
        // Error VibeGram lainnya
        console.error(`[${err.code}] ${err.message}`);

    } else {
        // Error tidak dikenal
        console.error('Error tidak dikenal:', err);
    }
});
```

## Properti Error

### `TelegramApiError`

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `message` | `string` | Pesan error |
| `errorCode` | `number` | Kode HTTP (400, 403, 429, dll) |
| `description` | `string` | Deskripsi dari API Telegram |
| `code` | `string` | `'TELEGRAM_403'`, dll |

### `RateLimitError`

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `retryAfter` | `number` | Detik sebelum bisa coba lagi |
| `code` | `string` | `'RATE_LIMIT'` |

### `NetworkError`

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `originalError` | `Error` | Error koneksi asli |
| `code` | `string` | `'NETWORK_ERROR'` |

### `ConversationTimeoutError`

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `chatId` | `number` | ID chat yang timeout |
| `code` | `string` | `'CONVERSATION_TIMEOUT'` |

## Penanganan Error Lokal

Tangani error langsung di dalam handler:

```typescript
bot.command('transfer', async (ctx) => {
    try {
        await ctx.banChatMember(targetId);
        await ctx.reply('✅ Berhasil!');
    } catch (err) {
        if (err instanceof TelegramApiError && err.errorCode === 400) {
            await ctx.reply('❌ Pengguna tidak ditemukan di grup ini.');
        } else {
            throw err; // lempar ke global handler
        }
    }
});
```

## Launch dengan Penanganan Error Token

```typescript
import { InvalidTokenError } from 'vibegram';

async function main() {
    try {
        await bot.launch();
    } catch (err) {
        if (err instanceof InvalidTokenError) {
            console.error('❌ Token bot tidak valid!');
            process.exit(1);
        }
        throw err;
    }
}

main();
```
