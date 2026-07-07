# Penanganan Error

VibeGram menyediakan global error catcher dan class error bertipe supaya kegagalan
bot bisa dicatat, diklasifikasi, dan dilaporkan ke user tanpa membuat process crash.

## Hierarki Error

```text
Error
  VibeGramError
    TelegramApiError
    NetworkError
    RateLimitError
    InvalidTokenError
    WebAppValidationError
    ConversationTimeoutError
```

## Global Error Handler

```typescript
bot.catch((err, ctx) => {
    console.error(`Error untuk update ${ctx.update.update_id}:`, err);
    ctx.reply('Terjadi kesalahan. Coba lagi nanti.').catch(() => {});
});
```

Jika tidak ada handler `bot.catch()`, VibeGram mencatat error ke
`console.error`.

## Penanganan Error Bertipe

```typescript
import {
    ConversationTimeoutError,
    InvalidTokenError,
    NetworkError,
    RateLimitError,
    TelegramApiError,
    VibeGramError,
} from 'vibegram';

bot.catch(async (err, ctx) => {
    if (err instanceof TelegramApiError) {
        console.error(`Telegram API ${err.errorCode}: ${err.description}`);

        if (err.errorCode === 403) {
            console.log(`User ${ctx.from?.id} mungkin memblokir bot`);
            return;
        }

        await ctx.reply('Telegram menolak request tersebut.').catch(() => {});
        return;
    }

    if (err instanceof RateLimitError) {
        console.warn(`Rate limited. Retry setelah ${err.retryAfter}s`);
        return;
    }

    if (err instanceof NetworkError) {
        console.error('Koneksi gagal:', err.originalError?.message);
        return;
    }

    if (err instanceof ConversationTimeoutError) {
        await ctx.reply('Conversation kedaluwarsa. Mulai lagi dari awal.').catch(() => {});
        return;
    }

    if (err instanceof VibeGramError) {
        console.error(`[${err.code}] ${err.message}`);
        return;
    }

    console.error('Error tidak dikenal:', err);
});
```

## Properti Error

### `TelegramApiError`

| Properti | Tipe | Deskripsi |
| --- | --- | --- |
| `message` | `string` | Pesan error |
| `errorCode` | `number` | Kode seperti status Telegram/API |
| `description` | `string` | Deskripsi dari Telegram API |
| `code` | `string` | Kode error stabil VibeGram |

### `RateLimitError`

| Properti | Tipe | Deskripsi |
| --- | --- | --- |
| `retryAfter` | `number` | Detik sebelum retry diizinkan |
| `code` | `string` | Kode error stabil VibeGram |

### `NetworkError`

| Properti | Tipe | Deskripsi |
| --- | --- | --- |
| `originalError` | `Error | undefined` | Error transport asli |
| `code` | `string` | Kode error stabil VibeGram |

### `ConversationTimeoutError`

| Properti | Tipe | Deskripsi |
| --- | --- | --- |
| `chatId` | `number | string | undefined` | Chat tempat timeout terjadi |
| `code` | `string` | Kode error stabil VibeGram |

## Penanganan Error Lokal

Tangani kegagalan yang sudah diperkirakan di dalam handler, lalu lempar ulang
error yang tidak terduga ke global handler:

```typescript
bot.command('ban', async ctx => {
    try {
        await ctx.banChatMember(targetId);
        await ctx.reply('User diblokir.');
    } catch (err) {
        if (err instanceof TelegramApiError && err.errorCode === 400) {
            await ctx.reply('User tidak ditemukan di chat ini.');
            return;
        }

        throw err;
    }
});
```

## Error Token Saat Launch

`launch()` memvalidasi token bot dengan `getMe()` sebelum mulai. Tangani
`InvalidTokenError` di entry point process:

```typescript
import { InvalidTokenError } from 'vibegram';

try {
    await bot.launch();
} catch (err) {
    if (err instanceof InvalidTokenError) {
        console.error('Token bot tidak valid.');
        process.exit(1);
    }

    throw err;
}
```

## Isolasi Error

Polling menunggu setiap update selesai sebelum lanjut ke update berikutnya, sehingga
satu update gagal tidak membuat unhandled rejection untuk sisa batch.

Webhook adapter menangkap error pemrosesan update dan mengembalikan `500 Internal
Server Error`; gunakan observability hooks dan `bot.catch()` untuk logging dan
respons user yang aman.

## Best Practices

- Daftarkan `bot.catch()` sebelum deployment produksi.
- Log metadata terstruktur seperti `update_id`, `chat.id`, dan class error.
- Jangan kirim stack trace atau pesan error mentah ke user.
- Jangan rethrow dari `bot.catch()` kecuali supervisor memang harus restart process.
