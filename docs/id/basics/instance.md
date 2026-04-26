# Instansi Bot & Polling

<FeatureGrid title="Pilih mode launch lebih dulu" description="Gunakan polling untuk pengembangan lokal dan webhook native atau adapter untuk deployment produksi.">
  <FeatureCard title="Polling" description="Long polling sederhana untuk lokal atau worker persistent." href="#mode-polling-pengembangan" cta="Buka polling" />
  <FeatureCard title="Webhook native" description="VibeGram membuat server HTTP, mendaftarkan webhook, menyediakan health check, dan ikut graceful shutdown." href="#mode-webhook-produksi" cta="Buka webhook" />
  <FeatureCard title="Adapter framework" description="Mount handler webhook di Express, Fastify, Hono, Koa, atau native HTTP." href="/id/adapters/express" cta="Buka adapter" />
</FeatureGrid>

<SecurityNote title="Keamanan mode launch" variant="tip">
Gunakan polling saat pengembangan lokal. Untuk produksi, gunakan webhook HTTPS dengan
secret token dan endpoint health check.
</SecurityNote>

## Membuat Instansi Bot

```typescript
import { Bot } from 'vibegram';

const bot = new Bot('TOKEN_BOT_ANDA');
```

::: tip Gunakan Variabel Lingkungan
Jangan pernah hardcode token langsung di kode. Gunakan `.env` dan `process.env.BOT_TOKEN`.
:::

## Opsi Launch

### Mode Polling (Pengembangan)

Polling cocok untuk pengembangan lokal — bot mengambil update secara berkala dari Telegram.

```typescript
bot.launch();
```

Dengan callback saat bot online:

```typescript
bot.launch({
    onStart: me => {
        console.log(`✅ Bot @${me.username} online!`);
        console.log(`   ID: ${me.id}`);
    },
});
```

### Mode Webhook (Produksi)

Untuk produksi, gunakan webhook agar Telegram mengirim update langsung ke server Anda. Mode native ini membuat HTTP server, mendaftarkan webhook ke Telegram, dan tetap memakai graceful shutdown dari `bot.stop()`:

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

Jika Anda sudah punya server Express, Fastify, Hono, Koa, atau native HTTP sendiri, gunakan adapter framework lalu daftarkan webhook secara manual:

```typescript
import express from 'express';
import { createExpressMiddleware } from 'vibegram';

const app = express();
app.use(express.json());

const webhook = createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});

app.post('/webhook', webhook);
app.get('/healthz', webhook);

await bot.setWebhook(`https://domain-anda.com/webhook`, {
    secret_token: process.env.WEBHOOK_SECRET,
});

app.listen(3000, () => console.log('Server webhook aktif di port 3000'));
```

## Graceful Shutdown

VibeGram secara otomatis menangani sinyal `SIGINT` dan `SIGTERM` saat `launch()` dipanggil — semua update yang sedang diproses akan diselesaikan sebelum proses berhenti.

```typescript
// Sinyal ditangani secara otomatis, tidak perlu konfigurasi tambahan.
bot.launch();

// Hentikan bot secara manual jika diperlukan:
await bot.stop();
```

## Validasi Token

Saat `launch()` dipanggil, VibeGram otomatis memvalidasi token bot dengan memanggil `getMe()`. Jika token tidak valid, `InvalidTokenError` akan dilempar sebelum polling dimulai:

```typescript
import { InvalidTokenError } from 'vibegram';

try {
    await bot.launch();
} catch (err) {
    if (err instanceof InvalidTokenError) {
        console.error('Token bot tidak valid! Periksa kembali token Anda.');
        process.exit(1);
    }
}
```

## Metode Bot Level-Tinggi

| Metode                        | Deskripsi                                                       |
| ----------------------------- | --------------------------------------------------------------- |
| `bot.launch(opts?)`           | Mulai polling atau native webhook dan daftarkan signal handlers |
| `bot.stop()`                  | Hentikan polling/webhook dengan graceful (async)                |
| `bot.handleUpdate(update)`    | Proses update secara manual                                     |
| `bot.setWebhook(url, opts?)`  | Daftarkan URL webhook ke Telegram                               |
| `bot.deleteWebhook(opts?)`    | Hapus webhook aktif                                             |
| `bot.getWebhookInfo()`        | Ambil info webhook aktif                                        |
| `bot.getMe()`                 | Ambil info bot                                                  |
| `bot.setMyCommands(commands)` | Atur daftar command yang terlihat di menu                       |
| `bot.deleteMyCommands()`      | Hapus daftar command                                            |
| `bot.use(...middlewares)`     | Daftarkan middleware global                                     |
| `bot.command(cmd, handler)`   | Tangani command `/cmd`                                          |
| `bot.hears(trigger, handler)` | Cocokkan teks/regex                                             |
| `bot.action(data, handler)`   | Tangani callback query                                          |
| `bot.on(type, handler)`       | Tangani tipe update tertentu                                    |

## Contoh Lengkap

```typescript
import { Bot, session, rateLimit } from 'vibegram';
import 'dotenv/config';

const bot = new Bot(process.env.BOT_TOKEN!);

// Pasang middleware global
bot.use(session({ initial: () => ({ count: 0 }) }));
bot.use(rateLimit());

// Handler
bot.command('start', ctx => ctx.reply('Halo! 👋'));
bot.command('hitung', async ctx => {
    ctx.session.count++;
    await ctx.reply(`Hitungan: ${ctx.session.count}`);
});

// Jalankan
bot.launch({ onStart: me => console.log(`@${me.username} aktif`) });
```
