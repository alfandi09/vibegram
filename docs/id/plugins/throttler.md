# Throttler

`@vibegram/throttler` mengantre dan mengatur tempo outgoing Telegram Bot API call sebelum terkena flood limit Telegram. Plugin ini adalah request transformer untuk `TelegramClient` dan dipasang dengan `bot.client.use()`.

## Kapan Dipakai

Gunakan plugin ini saat bot mengirim burst pesan, edit pesan, broadcast, atau callback answer dan kamu ingin outgoing flow control yang predictable.

Throttling bersifat proaktif. Ia memperlambat request sebelum Telegram mengembalikan `429`. Untuk ketahanan terbaik, kombinasikan dengan `@vibegram/auto-retry`, yang bereaksi terhadap failure yang tetap terjadi.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/throttler
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/throttler": "file:../vibegram/plugins/throttler"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { apiThrottler } from '@vibegram/throttler';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.client.use(apiThrottler());

bot.on('message', ctx => ctx.reply('This reply is throttled.'));

await bot.launch();
```

## Setup Production

Simpan handle throttler agar shutdown bisa melakukan drain antrean:

```typescript
const throttler = apiThrottler({
    global: { maxConcurrent: 30, minTime: 35 },
    group: { maxConcurrent: 1, minTime: 1000 },
    private: { maxConcurrent: 1, minTime: 1000 },
    methods: {
        answerCallbackQuery: { maxConcurrent: 10, minTime: 0, priority: 10 },
        sendInvoice: { maxConcurrent: 1, minTime: 1000, priority: 5 },
    },
    maxQueueSize: 5000,
    queueStrategy: 'reject',
});

bot.client.use(throttler);

process.once('SIGINT', () => void throttler.close());
process.once('SIGTERM', () => void throttler.close());
```

## Options

| Option | Default | Deskripsi |
| --- | --- | --- |
| `global` | `{ maxConcurrent: 30, minTime: 35 }` | Bucket untuk semua request. Set `false` untuk mematikan |
| `group` | `{ maxConcurrent: 1, minTime: 1000 }` | Bucket per `chat_id` negatif. Set `false` untuk mematikan |
| `private` | `{ maxConcurrent: 1, minTime: 1000 }` | Bucket per `chat_id` non-negatif. Set `false` untuk mematikan |
| `out` | sama seperti `private` | Alias untuk penamaan private outgoing seperti grammY |
| `methods` | kosong | Override bucket dan priority per method |
| `maxQueueSize` | `1000` | Maksimum jumlah request pending |
| `queueStrategy` | `reject` | `reject` atau `drop-oldest` saat antrean penuh |
| `priority` | kosong | Fungsi priority dinamis. Priority lebih tinggi jalan lebih dulu |

Field bucket:

| Field | Default | Deskripsi |
| --- | --- | --- |
| `maxConcurrent` | sesuai bucket | Maksimum request aktif dalam bucket |
| `minTime` | sesuai bucket | Minimum milidetik antar start request |
| `priority` | `0` | Priority statis untuk method bucket |

## Priority

Job antrean memakai priority tertinggi lebih dulu, lalu FIFO untuk priority yang sama.

```typescript
bot.client.use(
    apiThrottler({
        methods: {
            answerCallbackQuery: { priority: 10 },
            sendMessage: { priority: 0 },
        },
    })
);
```

Gunakan priority untuk method urgent dan ringan seperti `answerCallbackQuery`. Jangan gunakan priority sampai traffic pesan normal kelaparan.

## Queue Limits

Default-nya request baru akan ditolak saat antrean pending penuh:

```typescript
apiThrottler({
    maxQueueSize: 1000,
    queueStrategy: 'reject',
});
```

Jika request lama yang pending lebih buruk daripada menolak request terbaru, gunakan `drop-oldest`:

```typescript
apiThrottler({
    maxQueueSize: 1000,
    queueStrategy: 'drop-oldest',
});
```

Kedua strategi melempar `ThrottlerQueueOverflowError` untuk request yang ditolak atau dibuang.

## Handle

`apiThrottler()` mengembalikan transformer dengan kontrol runtime:

```typescript
const throttler = apiThrottler();

bot.client.use(throttler);

await throttler.idle();
await throttler.close();
console.log(throttler.stats());
```

| Method | Deskripsi |
| --- | --- |
| `stats()` | Mengembalikan counter active, pending, processed, rejected, dropped, dan closed |
| `idle()` | Resolve saat request aktif dan pending kosong |
| `close()` | Berhenti menerima request baru dan drain active/pending request |

## Komposisi dengan Auto Retry

Pasang throttling sebelum auto retry jika kamu ingin setiap retry attempt juga melewati throttler:

```typescript
bot.client.use(apiThrottler());
bot.client.use(autoRetry());
```

Karena transformer membungkus sesuai urutan registrasi, initial call dan retry attempt tetap ikut dipacing.

## Failure Modes

- Antrean penuh default-nya reject dengan `ThrottlerQueueOverflowError`.
- `drop-oldest` reject request pending tertua dan menerima request baru.
- `close()` reject request baru dengan `ThrottlerClosedError` dan drain pekerjaan yang sudah ada.
- Request tanpa `chat_id` hanya memakai global dan method bucket.

## Catatan Keamanan

- Throttler tidak membaca isi pesan atau konten file.
- Jangan simpan secret di method name atau telemetry yang kamu tambahkan di sekitar stats throttler.
- Gunakan queue size terbatas untuk bot publik agar spike traffic tidak membuat memory tumbuh tanpa batas.

## Validasi

Plugin ini punya test untuk global throttling, per-chat throttling, priority, queue overflow, drop-oldest behavior, dan graceful drain.

```bash
npm run plugins:validate
npm run docs:build
```
