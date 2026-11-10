# Paginasi

Keyboard Telegram jadi sulit dipakai jika tombolnya lebih dari belasan.
`Markup.pagination()` menampilkan daftar panjang per halaman: fungsi ini menerima
semua item dan nomor halaman saat ini, lalu mengembalikan inline keyboard berisi tombol
halaman itu dan baris navigasi (`⬅️ Prev`, indikator halaman, `Next ➡️`).

Fungsi ini hanya **menggambar** keyboard. Bot Anda yang mencatat halaman dan
menggambar ulang keyboard saat tombol navigasi ditekan.

## Memulai Cepat

```ts
import { Bot, Markup, type PaginationItem } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const produk: PaginationItem[] = Array.from({ length: 50 }, (_, i) => ({
    text: `Produk #${i + 1}`,
    callback_data: `buy:${i + 1}`,
}));

const halamanProduk = (halaman: number) =>
    Markup.pagination(produk, {
        currentPage: halaman,
        itemsPerPage: 5,
        actionPrev: `products:${halaman - 1}`, // halaman tujuan disimpan di tombolnya
        actionNext: `products:${halaman + 1}`,
        pageIndicatorPattern: 'Halaman {current} dari {total}',
    });

bot.command('katalog', ctx => ctx.reply('Lihat produk:', { reply_markup: halamanProduk(1) }));

bot.action(/^products:(\d+)$/, async ctx => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(halamanProduk(Number(ctx.match![1])));
});

bot.action('ignore_nav', ctx => ctx.answerCbQuery()); // tombol indikator halaman

bot.action(/^buy:(\d+)$/, ctx => ctx.answerCbQuery(`Produk #${ctx.match![1]} ditambahkan`));
```

Menyimpan halaman tujuan di callback data tombol navigasi membuat setiap pesan
berdiri sendiri: dua katalog yang terbuka bersamaan, atau tombol di pesan lama, tetap
menampilkan halaman yang benar, dan tidak ada yang perlu disimpan.

## Opsi

| Opsi | Tipe | Wajib | Deskripsi |
| --- | --- | --- | --- |
| `currentPage` | `number` | Ya | Halaman yang ditampilkan, mulai dari 1 (nilai di bawah 1 menjadi 1). |
| `itemsPerPage` | `number` | Ya | Jumlah tombol per halaman (nilai di bawah 1 menjadi 1). |
| `actionPrev` | `string` | Ya | Callback data tombol `⬅️ Prev` (disembunyikan di halaman 1). |
| `actionNext` | `string` | Ya | Callback data tombol `Next ➡️` (disembunyikan di halaman terakhir). |
| `columns` | `number` | Tidak | Jumlah tombol item per baris. Default `1`. |
| `pageIndicatorPattern` | `string` | Tidak | Label indikator; `{current}` dan `{total}` diganti. Default `'{current}/{total}'`. |

## Tombol Indikator Halaman

Tombol tengah menampilkan nomor halaman. Callback data-nya selalu `ignore_nav`. Jawab
sekali saja seperti di Memulai Cepat; kalau tidak, menekannya menampilkan ikon loading
di tombol selama beberapa detik.

## Menyimpan Halaman di Session

Menyimpan halaman di [session](/id/state/session) juga bisa jika callback data harus
tetap. Batasi nilainya: tombol di pesan lama masih bisa ditekan.

```ts
import { session } from 'vibegram';

bot.use(session({ initial: () => ({ page: 1 }) }));

const PER_HALAMAN = 5;
const totalHalaman = Math.ceil(produk.length / PER_HALAMAN);

bot.action(/^page_(next|prev)$/, async ctx => {
    const langkah = ctx.match![1] === 'next' ? 1 : -1;
    ctx.session.page = Math.min(totalHalaman, Math.max(1, ctx.session.page + langkah));

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
        Markup.pagination(produk, {
            currentPage: ctx.session.page,
            itemsPerPage: PER_HALAMAN,
            actionNext: 'page_next',
            actionPrev: 'page_prev',
        })
    );
});
```

Session menyimpan satu halaman per user, jadi dua daftar yang terbuka di chat yang sama
akan berbagi nilai yang sama.

## Tata Letak Grid

Atur `columns` untuk menampilkan beberapa tombol item per baris:

```ts
const keyboard = Markup.pagination(produk, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3,
    actionPrev: 'products:0',
    actionNext: 'products:2',
});
```

Hasilnya dua baris berisi tiga item, lalu baris navigasi.

## Markup.grid() untuk Grid Sederhana

Jika daftar muat di satu layar, `Markup.grid()` menyusun tombol ke dalam baris tanpa
navigasi:

```ts
const kategori = ['Elektronik', 'Pakaian', 'Makanan', 'Olahraga'];

await ctx.reply('Pilih kategori:', {
    reply_markup: Markup.grid(
        kategori.map(k => Markup.button.callback(k, `cat:${k.toLowerCase()}`)),
        2
    ),
});
```

## Batasan

Setiap `callback_data` maksimal 64 byte, dan Telegram menerima hingga 100 tombol per
keyboard. Buat halaman tetap kecil (5-10 item) agar muat di layar ponsel.
