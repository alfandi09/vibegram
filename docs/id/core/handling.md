# Routing & Listeners

VibeGram menyediakan berbagai listener untuk menangani semua jenis update dari Telegram.

## Command

Tangani command bot (pesan yang diawali `/`):

```typescript
bot.command('start', async (ctx) => {
    await ctx.reply('Halo! Saya siap membantu.');
});

// Beberapa command sekaligus
bot.command(['bantuan', 'help', 'info'], async (ctx) => {
    await ctx.reply('Daftar command: /start /bantuan');
});
```

### Argument Command

```typescript
bot.command('kirim', async (ctx) => {
    const args = ctx.command?.args; // ['arg1', 'arg2']
    const namaCommand = ctx.command?.name; // 'kirim'
    await ctx.reply(`Argument: ${args?.join(', ')}`);
});
```

## Hears — Pencocokan Teks

Tangani pesan yang mengandung teks tertentu:

```typescript
// String — cocok persis
bot.hears('ping', ctx => ctx.reply('Pong! 🏓'));

// RegExp — dengan capture group via ctx.match
bot.hears(/^pesan (.+)$/, async (ctx) => {
    const isi = ctx.match![1]; // teks yang ditangkap
    await ctx.reply(`Anda mengirim: "${isi}"`);
});

// Array trigger
bot.hears(['halo', 'hai', /^hey/i], ctx => ctx.reply('Hai!'));
```

::: info ctx.match
Saat trigger berupa RegExp, `ctx.match` berisi hasil `regex.exec(text)` — capture group tersedia via `ctx.match![1]`, `ctx.match![2]`, dst.
:::

## Action — Callback Query

Tangani klik tombol inline keyboard:

```typescript
bot.action('konfirmasi', async (ctx) => {
    await ctx.answerCbQuery('✅ Dikonfirmasi!');
    await ctx.editMessageText('Pesanan dikonfirmasi.');
});

// RegExp dengan capture group
bot.action(/^produk_(\d+)$/, async (ctx) => {
    const id = ctx.match![1];
    await ctx.answerCbQuery(`Produk #${id} dipilih`);
});
```

## On — Tipe Update Spesifik

Tangani tipe update atau properti pesan tertentu:

```typescript
// Tipe update level root
bot.on('message', ctx => {
    console.log('Ada pesan baru!');
});

bot.on('callback_query', ctx => {
    console.log('Ada klik tombol!');
});

// Properti dalam pesan
bot.on('photo', ctx => ctx.reply('Foto diterima! 📸'));
bot.on('video', ctx => ctx.reply('Video diterima! 🎬'));
bot.on('document', ctx => ctx.reply('Dokumen diterima! 📄'));
bot.on('sticker', ctx => ctx.reply('Stiker keren! 🎭'));
bot.on('voice', ctx => ctx.reply('Pesan suara diterima! 🎙️'));
bot.on('location', ctx => ctx.reply('Lokasi diterima! 📍'));
bot.on('contact', ctx => ctx.reply('Kontak diterima! 👤'));

// Array tipe
bot.on(['photo', 'video', 'document'], ctx => ctx.reply('Media diterima!'));
```

## Urutan Prioritas

Middleware dan listener dieksekusi **sesuai urutan pendaftaran**. Yang pertama didaftarkan, pertama dieksekusi:

```typescript
bot.use(logger);           // 1. Logger (selalu berjalan)
bot.on('message', ...);    // 2. Pesan apa saja
bot.command('start', ...); // 3. Hanya /start
bot.hears(/hi/, ...);      // 4. Hanya teks "hi"
```

## Menggabungkan Listener

Gunakan `Composer` untuk mengelola listener dalam grup:

```typescript
import { Composer } from 'vibegram';

const mediaHandler = new Composer();
mediaHandler.on('photo', handlePhoto);
mediaHandler.on('video', handleVideo);
mediaHandler.on('document', handleDocument);

bot.use(mediaHandler);
```
