# Instansi Bot & Polling

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
    onStart: (me) => {
        console.log(`✅ Bot @${me.username} online!`);
        console.log(`   ID: ${me.id}`);
    }
});
```

### Mode Webhook (Produksi)

Untuk produksi, gunakan webhook bersama salah satu adapter framework:

```typescript
import express from 'express';
import { createExpressMiddleware } from 'vibegram';

const app = express();
app.use(express.json());
app.post('/webhook', createExpressMiddleware(bot, {
    secretToken: process.env.WEBHOOK_SECRET
}));

// Daftarkan webhook ke Telegram
await bot.setWebhook(`https://domain-anda.com/webhook`, {
    secret_token: process.env.WEBHOOK_SECRET
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

| Metode | Deskripsi |
|--------|-----------|
| `bot.launch(opts?)` | Mulai polling & daftarkan signal handlers |
| `bot.stop()` | Hentikan polling dengan graceful (async) |
| `bot.handleUpdate(update)` | Proses update secara manual |
| `bot.setWebhook(url, opts?)` | Daftarkan URL webhook ke Telegram |
| `bot.deleteWebhook(opts?)` | Hapus webhook aktif |
| `bot.getWebhookInfo()` | Ambil info webhook aktif |
| `bot.getMe()` | Ambil info bot |
| `bot.setMyCommands(commands)` | Atur daftar command yang terlihat di menu |
| `bot.deleteMyCommands()` | Hapus daftar command |
| `bot.use(...middlewares)` | Daftarkan middleware global |
| `bot.command(cmd, handler)` | Tangani command `/cmd` |
| `bot.hears(trigger, handler)` | Cocokkan teks/regex |
| `bot.action(data, handler)` | Tangani callback query |
| `bot.on(type, handler)` | Tangani tipe update tertentu |

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
