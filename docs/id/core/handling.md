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

## Filter Query {#filter-query}

Pakai filter query untuk mencocokkan update **sekaligus** mempersempit tipe
`ctx`, sehingga tidak perlu `?.` atau `!` di dalam handler:

```ts
bot.on('message:photo', ctx => {
    const terbesar = ctx.message.photo.at(-1); // PhotoSize[] — dijamin ada
    return ctx.reply(`Foto ${terbesar?.width}px di chat ${ctx.chat.id}`);
});

bot.on(':text', ctx => ctx.reply(ctx.message.text.toUpperCase())); // semua update berbentuk pesan
bot.on('edited_message:text', ctx => console.log('Diedit:', ctx.message.text));
bot.on('callback_query:data', ctx => console.log(ctx.update.callback_query.data));
bot.on(['message:photo', 'message:video'], ctx => ctx.reply('Media diterima.'));
```

| Query | Cocok dengan |
| --- | --- |
| `'message'`, `'callback_query'`, ... | Semua update bertipe itu |
| `'<update pesan>:<field>'` | Message, edited message, channel post, atau business message yang punya `<field>` |
| `':<field>'` | Semua update berbentuk pesan yang punya `<field>` |
| `'callback_query:data'`, `'callback_query:game_short_name'` | Callback query dengan field tersebut |

Query yang salah format seperti `'message:'` atau `'poll:question'` melempar
`TypeError` saat handler didaftarkan. Nama lama seperti `'photo'` tetap
berfungsi tetapi tidak mempersempit tipe; gunakan `':photo'`.

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
