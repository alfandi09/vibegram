# Paginasi

Sistem paginasi otomatis VibeGram mengubah array apa pun menjadi keyboard inline yang bisa dinavigasi halaman per halaman.

## Memulai Cepat

```typescript
import { Markup, PaginationItem } from 'vibegram';

const produk: PaginationItem[] = Array.from({ length: 50 }).map((_, i) => ({
    text: `Produk #${i + 1}`,
    callback_data: `beli_${i + 1}`
}));

const keyboard = Markup.pagination(produk, {
    currentPage: 1,
    itemsPerPage: 5,
    actionNext: 'hal_berikut',
    actionPrev: 'hal_sebelum',
    pageIndicatorPattern: 'Hal {current} dari {total}'
});

await ctx.reply('Jelajahi produk:', { reply_markup: keyboard });
```

## Opsi

| Opsi | Tipe | Default | Deskripsi |
|------|------|---------|-----------|
| `currentPage` | `number` | `1` | Nomor halaman saat ini |
| `itemsPerPage` | `number` | `5` | Item per halaman |
| `columns` | `number` | `1` | Item per baris |
| `actionNext` | `string` | — | Callback data tombol "Berikutnya" |
| `actionPrev` | `string` | — | Callback data tombol "Sebelumnya" |
| `pageIndicatorPattern` | `string` | `'{current}/{total}'` | Pola teks indikator halaman |

## Menangani Navigasi

```typescript
bot.use(session({ initial: () => ({ halaman: 1 }) }));

bot.action(/hal_(berikut|sebelum)/, async (ctx) => {
    const arah = ctx.match![1] === 'berikut' ? 1 : -1;
    ctx.session.halaman = Math.max(1, ctx.session.halaman + arah);

    const keyboard = Markup.pagination(produk, {
        currentPage: ctx.session.halaman,
        itemsPerPage: 5,
        actionNext: 'hal_berikut',
        actionPrev: 'hal_sebelum',
        pageIndicatorPattern: 'Hal {current} dari {total}'
    });

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(keyboard);
});
```

## Tata Letak Grid

Gunakan `columns` untuk grid multi-kolom:

```typescript
const keyboard = Markup.pagination(produk, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3, // 3 item per baris × 2 baris = 6 item
    actionNext: 'hal_berikut',
    actionPrev: 'hal_sebelum'
});
// Layout:
// [Produk 1] [Produk 2] [Produk 3]
// [Produk 4] [Produk 5] [Produk 6]
// [← Sebelumnya] [1/10] [Berikutnya →]
```

## Markup.grid() untuk Grid Sederhana

Untuk array item yang tidak memerlukan paginasi, gunakan `Markup.grid()`:

```typescript
const kategori = ['Elektronik', 'Pakaian', 'Makanan', 'Olahraga'];

await ctx.reply('Pilih kategori:', {
    reply_markup: Markup.grid(
        kategori.map(k => Markup.button.callback(k, `kat_${k.toLowerCase()}`)),
        2 // 2 item per baris
    )
});
```

## Contoh Lengkap: Katalog Produk

```typescript
bot.use(session({ initial: () => ({ halaman: 1 }) }));

const tampilkanProduk = async (ctx: any, halaman: number) => {
    const keyboard = Markup.pagination(semuaProduk, {
        currentPage: halaman,
        itemsPerPage: 8,
        columns: 2,
        actionNext: 'prod_berikut',
        actionPrev: 'prod_sebelum',
        pageIndicatorPattern: '📦 {current}/{total}',
    });

    return ctx.reply('🛍️ Katalog Produk:', { reply_markup: keyboard });
};

bot.command('katalog', ctx => tampilkanProduk(ctx, 1));

bot.action(/prod_(berikut|sebelum)/, async ctx => {
    const arah = ctx.match![1] === 'berikut' ? 1 : -1;
    ctx.session.halaman = Math.max(1, (ctx.session.halaman || 1) + arah);

    const keyboard = Markup.pagination(semuaProduk, {
        currentPage: ctx.session.halaman,
        itemsPerPage: 8,
        columns: 2,
        actionNext: 'prod_berikut',
        actionPrev: 'prod_sebelum',
        pageIndicatorPattern: '📦 {current}/{total}',
    });

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(keyboard);
});

bot.action(/^beli_(\d+)$/, async ctx => {
    const id = ctx.match![1];
    await ctx.answerCbQuery(`✅ Produk #${id} ditambahkan!`);
});
```
