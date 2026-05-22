# Runner

`@vibegram/runner` menjalankan long polling VibeGram dengan concurrency yang dibatasi. Gunakan ini untuk bot polling yang traffic-nya cukup tinggi sehingga pemrosesan sequential dari `bot.launch()` mulai menjadi bottleneck.

## Kapan Dipakai

Gunakan `@vibegram/runner` saat bot memakai long polling dan butuh:

- pemrosesan update secara concurrent
- urutan per chat yang tetap aman
- backpressure saat antrean handler penuh
- graceful shutdown dengan drain handler yang masih berjalan
- hook lifecycle untuk metrics dan logging

Untuk bot kecil, `bot.launch()` tetap pilihan paling sederhana. Jangan menjalankan `bot.launch()` dan `run(bot)` dalam proses bot yang sama.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/runner
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/runner": "file:../vibegram/plugins/runner"
  }
}
```

Build repository dulu jika ingin mengetes secara lokal:

```bash
cd vibegram
npm install
npm run build
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { run } from '@vibegram/runner';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.on('message', ctx => ctx.reply('Handled concurrently.'));

const runner = run(bot);

process.once('SIGINT', () => void runner.stop());
process.once('SIGTERM', () => void runner.stop());
```

`run(bot)` langsung memulai polling dan mengembalikan runner handle.

## Setup Production

Atur runner berdasarkan traffic nyata, bukan tebakan. Mulai dari concurrency sedang, lalu naikkan hanya jika handler ringan CPU dan mayoritas waktunya menunggu I/O.

```typescript
const runner = run(bot, {
    concurrency: Number(process.env.RUNNER_CONCURRENCY ?? 32),
    orderedByChat: true,
    maxQueueSize: Number(process.env.RUNNER_MAX_QUEUE_SIZE ?? 1000),
    stopTimeoutMs: 30_000,
    retryDelayMs: 3000,
    polling: {
        limit: 100,
        timeout: 30,
        allowed_updates: ['message', 'callback_query'],
    },
    onError(event) {
        console.error('[runner:error]', {
            phase: event.phase,
            updateId: event.update?.update_id,
            error: event.error instanceof Error ? event.error.message : String(event.error),
            active: event.stats.active,
            pending: event.stats.pending,
        });
    },
    onUpdateComplete(event) {
        console.log('[runner:update]', {
            updateId: event.update.update_id,
            durationMs: event.durationMs,
            active: event.stats.active,
            pending: event.stats.pending,
        });
    },
});
```

## Dibandingkan dengan `bot.launch()`

| Fitur | `bot.launch()` | `@vibegram/runner` |
| --- | --- | --- |
| Long polling | ya | ya |
| Pemrosesan update concurrent | tidak | ya |
| Urutan per chat | sequential global | opsional, aktif default |
| Backpressure | implisit dari sequential processing | limit antrean pending eksplisit |
| Graceful stop | ya | ya, dengan timeout stop |
| Hook metrics | hook observability core | hook antrean dan update khusus runner |

`bot.launch()` sengaja sederhana dan sequential. `@vibegram/runner` ditujukan untuk proses polling dengan throughput lebih tinggi.

## Urutan Per Chat

Handler concurrent bisa membuat race condition jika dua update dari chat yang sama mengubah state bersama pada waktu yang sama. `orderedByChat` membuat update dari satu chat tetap sequential, sambil tetap memproses chat berbeda secara concurrent.

```typescript
run(bot, {
    concurrency: 32,
    orderedByChat: true,
});
```

Matikan opsi ini hanya jika handler stateless atau storage layer sudah menangani konflik dengan aman.

## Backpressure

`maxQueueSize` membatasi update pending yang menunggu kapasitas handler. Saat antrean penuh, runner menunggu sebelum menerima update tambahan dari batch polling saat ini.

```typescript
run(bot, {
    concurrency: 16,
    maxQueueSize: 500,
    onQueueFull(event) {
        console.warn('[runner:queue-full]', {
            pending: event.pending,
            active: event.active,
            capacity: event.capacity,
        });
    },
});
```

Jika hook ini sering terpanggil, kurangi pekerjaan di handler, naikkan kapasitas dengan hati-hati, atau pindahkan side effect lambat ke queue.

## Runner Handle

```typescript
const runner = run(bot);

runner.stats();
await runner.idle();
await runner.stop();
await runner.done();
```

| Method | Deskripsi |
| --- | --- |
| `stats()` | Mengembalikan counter received, processed, failed, active, pending, offset, dan state |
| `idle()` | Resolve saat antrean saat ini dan handler aktif kosong |
| `stop()` | Berhenti menerima update baru yang sudah fetched dan menunggu handler aktif |
| `done()` | Resolve saat polling loop selesai |

## Failure Modes

Error dari handler tidak menghentikan runner. Error dikirim ke `onError` dengan `phase: 'handleUpdate'`.

Kegagalan polling dikirim dengan `phase: 'polling'` dan dicoba ulang setelah `retryDelayMs`.

`stop()` bisa reject dengan `RunnerStopTimeoutError` jika handler tidak selesai sebelum `stopTimeoutMs`. Pastikan handler punya timeout saat memanggil sistem eksternal yang lambat.

## Catatan Keamanan

- Jangan log token bot atau header request Telegram mentah di hook runner.
- Jaga log hook tetap metadata-only kecuali kamu punya kebijakan privasi eksplisit untuk isi pesan.
- Untuk bot private, kombinasikan runner dengan allowlist atau rate-limit middleware sebelum handler mahal.

## Validasi

Plugin ini punya test untuk concurrency, urutan per chat, isolasi error handler, graceful stop, dan backpressure antrean.

```bash
npm run plugins:validate
npm run docs:build
```
