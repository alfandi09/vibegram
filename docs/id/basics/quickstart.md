# Quickstart

Panduan ini membuat bot kecil dengan command, middleware, session, error handling,
dan shutdown yang aman.

<PackageStats
  :stats="[
    { label: 'Runtime', value: 'Node.js 18+', description: 'Baseline modern' },
    { label: 'Output', value: 'CJS + ESM', description: 'Dual package' },
    { label: 'Types', value: 'Strict TS', description: 'Deklarasi tipe tersedia' }
  ]"
/>

<InstallTabs title="Install package" copy-label="Salin" copied-label="Tersalin" />

<SecurityNote title="Baseline produksi" variant="tip">
Gunakan panduan ini sebagai bentuk produksi minimal: token dari environment variable,
error handler global, rate limit, session, dan shutdown yang aman.
</SecurityNote>

<FeatureGrid title="Yang dicakup quickstart ini" description="Bergerak dari install package ke bot yang berjalan tanpa melewatkan fondasi keamanan.">
  <FeatureCard title="Install dan konfigurasi" description="Tambahkan package dan simpan token di luar source control." href="/id/basics/installation" cta="Buka instalasi" />
  <FeatureCard title="Susun middleware" description="Gunakan rate limit dan session sebelum handler utama." href="/id/core/middleware" cta="Buka middleware" />
  <FeatureCard title="Launch dengan aman" description="Mulai dari polling lokal, lalu pindah ke webhook untuk produksi." href="/id/basics/instance" cta="Buka launch" />
</FeatureGrid>

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
