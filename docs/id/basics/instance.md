# Instansi Bot & Polling

<FeatureGrid title="Pilih mode launch lebih dulu" description="Gunakan polling untuk pengembangan lokal dan webhook native atau adapter untuk deployment produksi.">
  <FeatureCard title="Polling" description="Long polling sederhana untuk lokal atau worker persistent." href="#opsi-polling" cta="Buka polling" />
  <FeatureCard title="Webhook native" description="VibeGram mengelola server HTTP, registrasi webhook, health check, dan shutdown." href="#mode-webhook" cta="Buka webhook" />
  <FeatureCard title="Adapter framework" description="Mount handler webhook di Express, Fastify, Hono, Koa, atau native HTTP." href="/id/adapters/express" cta="Buka adapter" />
</FeatureGrid>

<SecurityNote title="Keamanan mode launch" variant="tip">
Gunakan polling saat pengembangan lokal. Untuk produksi, gunakan webhook HTTPS dengan
secret token dan endpoint health check.
</SecurityNote>

## Membuat Bot

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
```

Simpan token di environment variable. `launch()` memvalidasi token dengan `getMe()`
sebelum polling atau webhook dimulai.

## Opsi Polling

Konfigurasi polling lewat constructor:

```typescript
const bot = new Bot(process.env.BOT_TOKEN!, {
    polling: {
        interval: 300,
        limit: 100,
        timeout: 30,
        offsetCommit: 'received',
        allowed_updates: ['message', 'callback_query', 'chat_member'],
    },
});
```

`offsetCommit` menentukan kapan offset polling Telegram dinaikkan:

| Nilai | Perilaku | Tradeoff |
| --- | --- | --- |
| `'received'` | Offset naik sebelum handler berjalan. | Kompatibel dengan perilaku lama dan menghindari update gagal berulang, tetapi crash bisa membuat update terlewat. |
| `'processed'` | Offset naik hanya setelah `handleUpdate()` sukses. | Lebih aman untuk pemrosesan at-least-once, tetapi handler gagal dapat menerima update yang sama lagi. Gunakan handler idempotent atau `dedupeUpdates()`. |

Mulai polling dengan callback startup opsional:

```typescript
await bot.launch({
    onStart: me => {
        console.log(`Bot @${me.username} aktif`);
    },
});
```

## Launch & Shutdown

`launch()` mendaftarkan graceful shutdown handler untuk `SIGINT` dan `SIGTERM`.
Anda juga bisa menghentikan bot secara manual:

```typescript
await bot.launch();
await bot.stop('Maintenance');
```

Untuk process handling custom:

```typescript
process.once('SIGINT', () => void bot.stop('SIGINT'));
process.once('SIGTERM', () => void bot.stop('SIGTERM'));
```

## Mode Webhook

Untuk deployment produksi, gunakan webhook sebagai pengganti polling:

```typescript
await bot.launch({
    webhook: {
        url: process.env.WEBHOOK_URL!,
        port: Number(process.env.PORT ?? 3000),
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    },
});
```

`launch({ webhook })` menjalankan server HTTP native VibeGram, mendaftarkan webhook
ke Telegram, dan berhenti dengan graceful saat `bot.stop()` atau process signal berjalan.

Jika Anda sudah punya server Express, Fastify, Hono, Koa, atau native HTTP sendiri,
mount adapter webhook dan daftarkan Telegram secara manual:

```typescript
import express from 'express';
import { createExpressMiddleware } from 'vibegram';

const app = express();
app.use(express.json({ limit: '1mb' }));

const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);

await bot.setWebhook('https://domain-anda.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000);
```

## Metode Bot Level-Tinggi

Metode ini tersedia langsung di instansi `Bot`:

| Metode | Deskripsi |
| --- | --- |
| `bot.launch(opts?)` | Mulai polling atau native webhook |
| `bot.stop(reason?)` | Hentikan polling atau webhook secara graceful |
| `bot.handleUpdate(update)` | Proses update secara manual |
| `bot.setWebhook(url, opts?)` | Daftarkan URL webhook ke Telegram |
| `bot.deleteWebhook(opts?)` | Hapus webhook aktif |
| `bot.getWebhookInfo()` | Ambil informasi webhook aktif |
| `bot.getMe()` | Ambil identitas bot |
| `bot.setMyCommands(commands)` | Atur menu command yang terlihat |
| `bot.deleteMyCommands()` | Hapus menu command yang terlihat |
| `bot.use(...middlewares)` | Daftarkan middleware global |
| `bot.command(cmd, handler)` | Tangani `/cmd` |
| `bot.hears(trigger, handler)` | Cocokkan teks atau regex |
| `bot.action(data, handler)` | Tangani callback query data |
| `bot.on(type, handler)` | Tangani tipe update tertentu |
