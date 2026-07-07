# Quickstart

Panduan ini membuat bot kecil dengan bentuk produksi: command, middleware, session,
error handling, dan graceful shutdown.

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
global error handling, rate limiting, session, dan graceful shutdown.
</SecurityNote>

<FeatureGrid title="Yang dicakup quickstart ini" description="Dari install package ke bot yang berjalan tanpa melewatkan fondasi keamanan yang dibutuhkan nanti.">
  <FeatureCard title="Install dan konfigurasi" description="Tambahkan package dan simpan token di luar source control." href="/id/basics/installation" cta="Buka instalasi" />
  <FeatureCard title="Susun middleware" description="Gunakan dedupe, rate limit, dan session sebelum handler." href="/id/core/middleware" cta="Buka middleware" />
  <FeatureCard title="Launch dengan aman" description="Mulai dari polling lokal, lalu pindah ke webhook untuk produksi." href="/id/basics/instance" cta="Buka launch" />
</FeatureGrid>

## Install

```bash
npm install vibegram dotenv
```

Buat file `.env` di project aplikasi:

```bash
BOT_TOKEN=123456:ganti-token
```

Jangan commit file `.env`. Di produksi, isi variable yang sama lewat secret
manager host Anda.

## Bot

Buat `src/bot.ts`:

```typescript
import 'dotenv/config';
import { Bot, dedupeUpdates, rateLimit, session } from 'vibegram';

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN wajib diisi');
}

const bot = new Bot(token, {
    polling: {
        offsetCommit: 'processed',
    },
    observability: {
        hooks: {
            onPollingError: ({ error }) => console.error('Polling gagal', error),
            onUpdateError: ({ error }) => console.error('Update gagal', error),
        },
    },
});

bot.use(dedupeUpdates());
bot.use(rateLimit());
bot.use(session({ initial: () => ({ visits: 0 }) }));

bot.start(async ctx => {
    ctx.session.visits += 1;
    await ctx.reply(`Selamat datang. Kunjungan di chat ini: ${ctx.session.visits}`);
});

bot.help(ctx => ctx.reply('Kirim /start untuk mencoba bot.'));

bot.on('message', async ctx => {
    await ctx.reply('Pesan diterima.');
});

bot.catch(async (error, ctx) => {
    console.error('Error bot tidak tertangani', error);
    await ctx.reply('Terjadi kesalahan. Coba lagi.');
});

await bot.launch();
```

## Run

```bash
npx ts-node src/bot.ts
```

Untuk deployment jangka panjang, jalankan bot di bawah process manager dan simpan
log di luar source tree.

## Checklist

- Simpan secret di environment variable.
- Daftarkan `bot.catch()` sebelum deployment.
- Gunakan `dedupeUpdates()` saat retry atau polling processed-offset bisa mengulang update.
- Gunakan `rateLimit()` untuk bot publik.
- Jalankan `npm test` dan `npm run build` sebelum merilis bot Anda.
