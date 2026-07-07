# Keyboard

VibeGram menyediakan builder deklaratif `Markup` untuk inline keyboard, reply
keyboard, pagination, dan escaping teks yang aman.

## Inline Keyboard

Inline keyboard muncul di bawah pesan dan biasanya memicu callback query atau
membuka surface Telegram yang didukung.

```ts
import { Markup } from 'vibegram';

const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Beli', 'buy_1'), Markup.button.callback('Batal', 'cancel')],
    [Markup.button.url('Website', 'https://contoh.com')],
]);

await ctx.reply('Pilih opsi:', { reply_markup: keyboard });
```

## Markup.grid()

Gunakan `Markup.grid()` saat sudah punya array tombol inline datar dan ingin
VibeGram membaginya menjadi beberapa baris.

```ts
const days = ['Sen', 'Sel', 'Rab', 'Kam'].map(day => {
    return Markup.button.callback(day, `day:${day}`);
});

await ctx.reply('Pilih hari:', {
    reply_markup: Markup.grid(days, 2),
});
```

## Tipe Tombol Inline

| Method | Deskripsi |
| --- | --- |
| `Markup.button.callback(text, data)` | Mengirim callback data ke `bot.action()`. |
| `Markup.button.url(text, url)` | Membuka URL eksternal. |
| `Markup.button.webApp(text, url)` | Membuka Telegram Mini App. |
| `Markup.button.pay(text)` | Tombol pembayaran untuk pesan invoice. |
| `Markup.button.switchInlineQuery(text, query)` | Membuka inline mode di chat lain. |
| `Markup.button.switchInlineQueryCurrentChat(text, query)` | Membuka inline mode di chat saat ini. |
| `Markup.button.login(text, loginUrl)` | Tombol Telegram Login. |
| `Markup.button.copy(text, textToCopy)` | Tombol copy-to-clipboard. |

## Contoh Login Button

```ts
await ctx.reply('Masuk:', {
    reply_markup: Markup.inlineKeyboard([
        [
            Markup.button.login('Login dengan Telegram', {
                url: 'https://contoh.com/auth/telegram',
                request_write_access: true,
            }),
        ],
    ]),
});
```

## Contoh Copy Button

```ts
await ctx.reply('Salin kode undangan:', {
    reply_markup: Markup.inlineKeyboard([
        [Markup.button.copy('Salin kode', 'INVITE-2026')],
    ]),
});
```

## Paginasi

```ts
const items = products.map(product => ({
    text: product.name,
    callback_data: `product:${product.id}`,
}));

await ctx.reply('Katalog:', {
    reply_markup: Markup.pagination(items, {
        currentPage: 1,
        itemsPerPage: 6,
        columns: 2,
        actionPrev: 'catalog:prev',
        actionNext: 'catalog:next',
        pageIndicatorPattern: '{current}/{total}',
    }),
});
```

Tangani `actionPrev`, `actionNext`, dan callback data item dengan
`bot.action()`.

## Reply Keyboard

Reply keyboard mengganti keyboard perangkat dengan tombol native Telegram.

```ts
const keyboard = Markup.keyboard(
    [
        [Markup.replyButton.text('Berita'), Markup.replyButton.text('Pengaturan')],
        [Markup.replyButton.requestContact('Bagikan nomor')],
        [Markup.replyButton.requestLocation('Bagikan lokasi')],
    ],
    {
        resize_keyboard: true,
        one_time_keyboard: false,
    }
);

await ctx.reply('Menu:', { reply_markup: keyboard });
```

## Tipe Tombol Reply

| Method | Deskripsi |
| --- | --- |
| `Markup.replyButton.text(text)` | Tombol teks biasa. |
| `Markup.replyButton.requestContact(text)` | Meminta nomor telepon user. |
| `Markup.replyButton.requestLocation(text)` | Meminta lokasi user. |
| `Markup.replyButton.requestPoll(text, type?)` | Membuka pembuatan poll. |
| `Markup.replyButton.requestUser(text, requestId, options?)` | Membuka pemilihan user Telegram. |
| `Markup.replyButton.requestChat(text, requestId, options?)` | Membuka pemilihan chat. |
| `Markup.replyButton.requestManagedBot(text, requestId, options?)` | Meminta otorisasi managed bot. |

## Hapus Keyboard

```ts
await ctx.reply('Keyboard dihapus.', {
    reply_markup: Markup.removeKeyboard(),
});
```

## Force Reply

```ts
await ctx.reply('Siapa nama kamu?', {
    reply_markup: Markup.forceReply({
        input_field_placeholder: 'Ketik nama...',
    }),
});
```

## Escape Teks Tak Tepercaya

Saat menyisipkan teks dari user ke pesan dengan `parse_mode`, escape hanya nilai
dinamisnya.

```ts
const safeHtml = Markup.escapeHTML(userName);
await ctx.reply(`Halo <b>${safeHtml}</b>`, { parse_mode: 'HTML' });

const safeMarkdown = Markup.escapeMarkdownV2(userName);
await ctx.reply(`Halo *${safeMarkdown}*`, { parse_mode: 'MarkdownV2' });

const safeLegacyMarkdown = Markup.escapeMarkdown(userName);
await ctx.reply(`Halo _${safeLegacyMarkdown}_`, { parse_mode: 'Markdown' });
```

| Helper | Dipakai dengan |
| --- | --- |
| `Markup.escapeHTML(text)` | `parse_mode: 'HTML'` |
| `Markup.escapeMarkdownV2(text)` | `parse_mode: 'MarkdownV2'` |
| `Markup.escapeMarkdown(text)` | `parse_mode: 'Markdown'` (legacy) |

Jika seluruh balasan adalah konten dinamis dari user, kirim plain text tanpa
`parse_mode`.
