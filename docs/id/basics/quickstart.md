# Quickstart

Panduan ini membuat bot kecil dengan command, middleware, session, error handling,
dan shutdown yang aman.

## Instalasi

```bash
npm install vibegram
```

Simpan token di environment variable:

```bash
BOT_TOKEN=123456:ganti-token
```

Jangan commit file `.env`.

## Bot

```typescript
import 'dotenv/config';
import { Bot, session, rateLimit } from 'vibegram';

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN wajib diisi');
}

const bot = new Bot(token);

bot.use(rateLimit());
bot.use(session({ initial: () => ({ visits: 0 }) }));

bot.start(async ctx => {
    ctx.session.visits += 1;
    await ctx.reply(`Selamat datang. Kunjungan: ${ctx.session.visits}`);
});

bot.help(ctx => ctx.reply('Kirim /start untuk mencoba bot.'));

bot.catch(async (error, ctx) => {
    console.error(error);
    await ctx.reply('Terjadi kesalahan. Coba lagi.');
});

await bot.launch();
```

## Checklist

- Simpan secret di environment variable.
- Gunakan `bot.catch()`.
- Pakai `rateLimit()` untuk bot publik.
- Jalankan test dan build sebelum deploy.
