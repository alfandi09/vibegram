# Auto Retry

`@vibegram/auto-retry` mengulang outgoing Telegram Bot API call saat kegagalan kemungkinan bersifat sementara. Plugin ini adalah request transformer untuk `TelegramClient` dan dipasang dengan `bot.client.use()`.

## Kapan Dipakai

Gunakan plugin ini saat bot sering mengirim pesan, broadcast, mengedit pesan, atau memanggil API Telegram sehingga transient failure sebaiknya ditangani terpusat.

Plugin ini mengulang:

- HTTP `429` flood-limit response memakai Telegram `retry_after`
- kegagalan network seperti timeout dan connection reset
- error server Telegram HTTP `5xx`

Plugin ini tidak mengulang error client `4xx` biasa seperti payload yang salah.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/auto-retry
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/auto-retry": "file:../vibegram/plugins/auto-retry"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { autoRetry } from '@vibegram/auto-retry';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.client.use(autoRetry());

bot.on('message', ctx => ctx.reply('Hello with retry support.'));

await bot.launch();
```

## Setup Production

Gunakan retry policy yang dibatasi dan log metadata retry tanpa payload:

```typescript
bot.client.use(
    autoRetry({
        maxRetries: Number(process.env.AUTO_RETRY_MAX_RETRIES ?? 3),
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        maxRetryAfterMs: 60_000,
        excludeMethods: ['sendInvoice'],
        onRetry(event) {
            console.warn('[telegram:auto-retry]', {
                method: event.method,
                reason: event.reason,
                retryAttempt: event.retryAttempt,
                delayMs: event.delayMs,
                error: event.error,
            });
        },
    })
);
```

## Cara Compose

`autoRetry()` dipasang sebagai transformer `TelegramClient`:

```typescript
bot.client.use(autoRetry());
```

Transformer ini mematikan counter retry bawaan client untuk request yang ia kelola. Dengan begitu perilaku retry tetap terpusat di plugin dan satu request tidak melewati dua retry loop bersarang.

## Options

| Option | Default | Deskripsi |
| --- | --- | --- |
| `maxRetries` | `3` | Maksimum retry setelah request pertama gagal |
| `baseDelayMs` | `500` | Delay awal exponential backoff untuk network dan HTTP 5xx |
| `maxDelayMs` | `10000` | Maksimum delay exponential backoff |
| `maxRetryAfterMs` | `Infinity` | Maksimum delay Telegram `retry_after` sebelum error dilempar |
| `jitter` | `0.2` | Menambah jitter pada backoff. Set `false` untuk delay deterministic |
| `includeMethods` | semua | Retry hanya method Bot API yang terdaftar |
| `excludeMethods` | kosong | Jangan pernah retry method Bot API yang terdaftar |
| `retryNonIdempotentMethods` | `true` | Retry write method seperti `sendMessage`; set `false` untuk read-only method |
| `redact` | regex token Telegram | Redactor tambahan berupa string atau regex untuk event hook |
| `onRetry` | kosong | Hook observability aman sebelum tiap retry |

## Default yang Direkomendasikan

Untuk bot normal:

```typescript
bot.client.use(
    autoRetry({
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        maxRetryAfterMs: 60_000,
    })
);
```

Untuk broadcast, jaga `maxRetryAfterMs` cukup besar agar flood limit Telegram tetap dihormati, tetapi exclude method yang tidak boleh diulang setelah stale.

```typescript
bot.client.use(
    autoRetry({
        maxRetries: 5,
        maxRetryAfterMs: 5 * 60 * 1000,
        excludeMethods: ['sendInvoice'],
    })
);
```

## Method Non-Idempotent

Telegram write call bisa punya side effect. Secara default, plugin tetap mengulangnya karena menangani flood limit untuk `sendMessage`, `editMessageText`, dan method sejenis adalah use case utama.

Jika workflow kamu tidak boleh menerima risiko duplicate write setelah network failure yang statusnya tidak pasti, matikan retry non-idempotent:

```typescript
bot.client.use(
    autoRetry({
        retryNonIdempotentMethods: false,
    })
);
```

Dengan opsi itu, hanya method `get*` yang diulang otomatis.

## Auto Retry vs Throttling

Auto retry bereaksi setelah request gagal. Throttling mengatur arus request sebelum Telegram menolaknya.

| Concern | Auto retry | Throttling |
| --- | --- | --- |
| Recovery HTTP 429 | ya | tidak |
| Recovery network timeout | ya | tidak |
| Mencegah flood limit | tidak | ya |
| Queue outgoing request | tidak | ya |

Gunakan keduanya untuk bot volume tinggi: throttling untuk menghindari flood, auto retry untuk memulihkan failure yang tetap terjadi.

## Failure Modes

- Jika `maxRetries` habis, error terakhir dilempar.
- Jika Telegram `retry_after` lebih besar dari `maxRetryAfterMs`, rate-limit error langsung dilempar.
- Kegagalan `onRetry` diabaikan agar kode observability tidak merusak outgoing API call.
- Plugin tidak membaca payload request, jadi tidak bisa melakukan deduplikasi side effect.

## Catatan Keamanan

- `onRetry` menerima metadata saja. Hook tidak menerima payload request atau raw error.
- String berbentuk token Telegram akan diredact dari pesan error di retry hook.
- Tambahkan `redact` custom jika environment kamu memakai format secret lain.
- Jangan log isi pesan penuh dari wrapper hook milikmu kecuali kebijakan privasi mengizinkan.

## Validasi

Plugin ini punya test untuk `retry_after`, network retry, HTTP 5xx retry, method filter, kontrol retry non-idempotent, dan event retry hook yang diredact.

```bash
npm run plugins:validate
npm run docs:build
```
