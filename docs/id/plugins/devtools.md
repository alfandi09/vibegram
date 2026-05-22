# Devtools

`@vibegram/devtools` merekam snapshot update yang sudah disanitasi, timing middleware, log outgoing Telegram API, dan fixture replay untuk debugging lokal.

Gunakan plugin ini saat bug hanya muncul dengan update Telegram asli, saat kamu butuh fixture minimal untuk regression test, atau saat performa middleware perlu timing trail sederhana.

## Mapping Resmi Telegram

Plugin ini merekam object seperti Telegram `Update` yang sudah diterima bot dan bisa me-replay object itu ke target seperti `handleUpdate(update)`.

Plugin ini tidak memanggil Telegram sendiri. Devtools hanya membungkus `ctx.client.callApi()` selama update berjalan untuk mencatat nama method, payload request yang sudah disanitasi, durasi, status sukses/gagal, dan response yang disanitasi jika diaktifkan.

Referensi: [Telegram Bot API Update](https://core.telegram.org/bots/api#update), [getUpdates](https://core.telegram.org/bots/api#getupdates), dan [Making requests](https://core.telegram.org/bots/api#making-requests).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/devtools
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/devtools": "file:../vibegram/plugins/devtools"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { devtools } from '@vibegram/devtools';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(devtools({
    capture: process.env.NODE_ENV !== 'production',
    jsonlPath: '.vibegram/events.jsonl',
    redact: ['session', 'authorization'],
}));

await bot.launch();
```

Jika `capture` tidak diisi, devtools merekam di luar production dan tidak aktif saat `NODE_ENV=production`.

## Event yang Direkam

Devtools menulis event JSON ke sink. Sink JSONL bawaan menulis satu event per baris:

```typescript
bot.use(devtools({
    capture: true,
    jsonlPath: '.vibegram/events.jsonl',
}));
```

Tipe event umum:

| Type | Arti |
| --- | --- |
| `update` | Snapshot update yang sudah disanitasi |
| `api` | Method Telegram API, request, durasi, dan status hasil |
| `timing` | Timing span middleware |
| `error` | Metadata error yang sudah disanitasi |

Key default yang di-redact mencakup `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, dan `prompt`.

## Timing Span

Gunakan `ctx.devtools.time()` di handler:

```typescript
bot.command('report', async ctx => {
    const data = await ctx.devtools.time('load-report-data', () => loadReport(ctx.from.id));
    await ctx.reply(renderReport(data));
});
```

Atau bungkus middleware:

```typescript
import { withDevtoolsTiming } from '@vibegram/devtools';

bot.use(withDevtoolsTiming('auth', authMiddleware));
```

Setiap update yang direkam juga menghasilkan event `timing` bernama `update`.

## Log API

Devtools membungkus scoped `ctx.client.callApi()` untuk update saat ini:

```typescript
bot.use(devtools({
    capture: true,
    includeApiResult: false,
}));
```

`includeApiResult` default-nya `false` karena response Telegram bisa berisi data user. Aktifkan hanya saat debugging dan tetap gunakan redaction sanitizer.

## Replay

Gunakan `createReplayFixture()` untuk mengekspor satu update yang sudah disanitasi sebagai test fixture:

```typescript
import { createReplayFixture, replayUpdates } from '@vibegram/devtools';

const fixture = createReplayFixture(ctx.update);

await replayUpdates(bot, [fixture]);
```

`replayUpdates()` menerima function:

```typescript
await replayUpdates(update => bot.handleUpdate(update), [fixture]);
```

atau object seperti bot:

```typescript
await replayUpdates(bot, [fixture]);
```

Untuk file JSONL dari sink:

```typescript
import { replayJsonl } from '@vibegram/devtools';

await replayJsonl(bot, '.vibegram/events.jsonl');
```

## Options

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `capture` | `boolean \| (ctx) => boolean \| Promise<boolean>` | nonaktif di production | Mengontrol apakah update direkam |
| `env` | `string` | `process.env.NODE_ENV` | Dipakai untuk deteksi default production |
| `sink` | `DevtoolsSink` | console sink | Custom event sink |
| `jsonlPath` | `string` | none | Menulis event ke JSONL saat `sink` tidak diisi |
| `redact` | `string[]` | default sensitif | Key tambahan untuk di-redact |
| `replacement` | `string` | `[REDACTED]` | Pengganti value yang di-redact |
| `maxDepth` | `number` | `12` | Kedalaman traversal sanitizer |
| `includeApiResult` | `boolean` | `false` | Sertakan response API yang sudah disanitasi |
| `failOnSinkError` | `boolean` | `false` | Throw jika sink gagal menulis |
| `clock` | `() => number` | `Date.now` | Clock custom untuk test |

## TypeScript

Gunakan `DevtoolsFlavor` saat custom context mengakses `ctx.devtools`:

```typescript
import type { DevtoolsFlavor } from '@vibegram/devtools';

type MyContext = DevtoolsFlavor<Context>;

async function profile(ctx: MyContext) {
    return ctx.devtools.time('profile', () => loadProfile(ctx.from.id));
}
```

Package juga mengekspor `DevtoolsSink`, `DevtoolsLogEvent`, `DevtoolsUpdate`, `MemoryDevtoolsSink`, `createJsonlSink()`, `createConsoleSink()`, `readJsonlReplay()`, `replayJsonl()`, dan `sanitizeValue()`.

## Failure Mode

- Kegagalan menulis sink diabaikan secara default supaya tooling debug tidak memutus handling bot.
- Set `failOnSinkError: true` di test jika sink harus divalidasi.
- Fixture yang direkam adalah clone yang sudah disanitasi; nilai non-JSON seperti function menjadi marker.
- Replay tidak menghubungi Telegram. Replay hanya memasukkan update tersimpan kembali ke kode lokal.

## Catatan Keamanan

Jangan simpan raw production updates tanpa retention policy dan aturan penanganan data user yang jelas. Update Telegram bisa berisi nama, username, teks pesan, file ID, lokasi, dan data terkait payment.

Biarkan `capture` nonaktif di production kecuali ada window debugging yang disengaja. Tambahkan key redaction khusus project untuk session, auth header, prompt, ID internal, dan payload bisnis sebelum menulis file JSONL.

## Validasi

Package ini punya test untuk sanitized update capture, replay fixture, timing middleware, redaksi log API, default capture production, penulisan JSONL, dan timing wrapper.

```bash
npm run plugins:validate
npm run docs:build
```
