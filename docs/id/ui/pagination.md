# Paginasi

`Markup.pagination()` mengubah array item inline keyboard menjadi keyboard
inline berpaginasi dengan navigasi previous/next.

## Memulai Cepat

```ts
import { Markup, type PaginationItem } from 'vibegram';

const products: PaginationItem[] = Array.from({ length: 50 }).map((_, i) => ({
    text: `Produk #${i + 1}`,
    callback_data: `buy_${i + 1}`,
}));

const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 5,
    actionNext: 'page_next',
    actionPrev: 'page_prev',
    pageIndicatorPattern: 'Hal {current} dari {total}',
});

await ctx.reply('Jelajahi produk:', { reply_markup: keyboard });
```

## Opsi

| Opsi | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `currentPage` | `number` | `1` | Nomor halaman saat ini. |
| `itemsPerPage` | `number` | `1` di guard implementasi | Item per halaman. |
| `columns` | `number` | `1` | Item per baris. |
| `actionNext` | `string` | Wajib | Callback data tombol next. |
| `actionPrev` | `string` | Wajib | Callback data tombol previous. |
| `pageIndicatorPattern` | `string` | `'{current}/{total}'` | Pola label indikator halaman. |

`currentPage` dan `itemsPerPage` dijaga minimal `1`.

## Menangani Navigasi

```ts
bot.use(session({ initial: () => ({ page: 1 }) }));

bot.action(/page_(next|prev)/, async ctx => {
    const direction = ctx.match?.[1] === 'next' ? 1 : -1;
    ctx.session.page = Math.max(1, ctx.session.page + direction);

    const keyboard = Markup.pagination(products, {
        currentPage: ctx.session.page,
        itemsPerPage: 5,
        actionNext: 'page_next',
        actionPrev: 'page_prev',
        pageIndicatorPattern: 'Hal {current} dari {total}',
    });

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(keyboard);
});
```

Simpan halaman saat ini di session, database, atau callback data sesuai berapa
lama state navigasi perlu bertahan.

## Tata Letak Grid

Gunakan `columns` untuk halaman multi-kolom.

```ts
const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3,
    actionNext: 'page_next',
    actionPrev: 'page_prev',
});
```

Ini merender maksimal tiga tombol item per baris, lalu menambahkan baris
navigasi.

## Markup.grid() untuk Grid Sederhana

Jika tidak perlu pagination, gunakan `Markup.grid()`.

```ts
const categories = ['Elektronik', 'Pakaian', 'Makanan', 'Olahraga'];

await ctx.reply('Pilih kategori:', {
    reply_markup: Markup.grid(
        categories.map(category => {
            return Markup.button.callback(category, `cat_${category.toLowerCase()}`);
        }),
        2
    ),
});
```

`Markup.grid()` hanya menyusun tombol. Method ini tidak menambahkan kontrol
navigasi.

## Contoh Lengkap Katalog Produk

```ts
bot.use(session({ initial: () => ({ page: 1 }) }));

function productKeyboard(page: number) {
    return Markup.pagination(allProducts, {
        currentPage: page,
        itemsPerPage: 8,
        columns: 2,
        actionNext: 'products_next',
        actionPrev: 'products_prev',
        pageIndicatorPattern: '{current}/{total}',
    });
}

bot.command('catalog', ctx => {
    ctx.session.page = 1;
    return ctx.reply('Katalog produk:', {
        reply_markup: productKeyboard(ctx.session.page),
    });
});

bot.action(/products_(next|prev)/, async ctx => {
    const direction = ctx.match?.[1] === 'next' ? 1 : -1;
    ctx.session.page = Math.max(1, ctx.session.page + direction);

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(productKeyboard(ctx.session.page));
});

bot.action(/^buy_(\d+)$/, async ctx => {
    const id = ctx.match?.[1];
    await ctx.answerCbQuery(`Produk #${id} ditambahkan`);
});
```
