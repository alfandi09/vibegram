# Routing & Listeners

VibeGram merutekan update masuk melalui middleware dan helper listener di `Bot`
dan `Composer`.

## Command

```ts
bot.command('start', async ctx => {
    await ctx.reply('Halo!');
});

bot.command(['help', 'info'], async ctx => {
    await ctx.reply('Command tersedia: /start /help');
});
```

Handler command menerima metadata terparse di `ctx.command`.

## Argumen Command

```ts
bot.command('ban', async ctx => {
    const target = ctx.command?.args[0];
    const reason = ctx.command?.args.slice(1).join(' ');

    await ctx.reply(`Target: ${target}, alasan: ${reason}`);
});
```

Command dengan suffix username bot sudah target-aware. `/start` tetap cocok,
`/start@YourBot` cocok untuk bot ini, dan `/start@OtherBot` diabaikan setelah
username bot diketahui dari `getMe()`.

## Pencocokan Teks

```ts
bot.hears('ping', ctx => ctx.reply('Pong!'));

bot.hears(/^harga (\d+)/i, ctx => {
    const amount = ctx.match?.[1];
    return ctx.reply(`Harga cocok: ${amount}`);
});

bot.hears(['halo', 'hai', /^hey/i], ctx => ctx.reply('Halo!'));
```

Saat trigger berupa regular expression, capture group tersedia melalui
`ctx.match`.

## Callback Actions

```ts
bot.action('confirm_order', async ctx => {
    await ctx.answerCbQuery('Pesanan dikonfirmasi');
    await ctx.editMessageText('Pesanan dikonfirmasi.');
});

bot.action(/^item_(\d+)$/, async ctx => {
    const itemId = ctx.match?.[1];
    await ctx.answerCbQuery(`Item ${itemId} dipilih`);
});
```

`bot.action()` tidak auto-answer callback query. Panggil `ctx.answerCbQuery()`
di dalam handler untuk menghentikan loading indicator Telegram.

## Event Listeners

```ts
bot.on('message', ctx => {
    console.log('Pesan baru', ctx.message?.message_id);
});

bot.on('photo', ctx => ctx.reply('Foto diterima.'));
bot.on('document', ctx => ctx.reply('Dokumen diterima.'));
bot.on('callback_query', ctx => ctx.answerCbQuery());

bot.on(['photo', 'video', 'document'], ctx => ctx.reply('Media diterima.'));
```

`bot.on()` menerima tipe update root dan properti pesan umum.

## Inline Queries

```ts
bot.on('inline_query', async ctx => {
    await ctx.answerInlineQuery([
        {
            type: 'article',
            id: '1',
            title: 'Result 1',
            input_message_content: { message_text: 'Halo!' },
        },
    ]);
});
```

Handler inline query harus menjawab dengan objek result yang didukung Telegram.

## Urutan Eksekusi

Middleware dan listener berjalan sesuai urutan pendaftaran.

```ts
bot.use(logger());         // 1. Berjalan untuk setiap update
bot.on('message', handle); // 2. Berjalan untuk message
bot.command('start', fn);  // 3. Berjalan untuk /start
bot.hears(/hi/i, fn);      // 4. Berjalan untuk teks yang cocok
```

Letakkan middleware security, logging, session, dan rate-limit sebelum handler
yang membutuhkannya.

## Menggabungkan Listener

```ts
import { Composer } from 'vibegram';

const media = new Composer();
media.on('photo', handlePhoto);
media.on('video', handleVideo);
media.on('document', handleDocument);

bot.use(media);
```

Gunakan `Composer` untuk mengelompokkan route terkait ke module atau plugin.
