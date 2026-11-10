# Inline Query Builder

Di **mode inline**, user mengetik `@botanda sesuatu` di chat mana pun lalu memilih hasil
dari daftar yang dikirim bot Anda, seperti kotak pencarian yang bisa dipakai di mana
saja. `InlineResults` menyusun daftar hasil itu dengan opsi bertipe untuk setiap jenis
hasil.

## Aktifkan Mode Inline Dulu

Telegram hanya mengirim update `inline_query` ke bot yang mode inline-nya aktif. Buka
[@BotFather](https://t.me/BotFather), kirim `/setinline`, pilih bot Anda, lalu ketik
teks placeholder yang dilihat user (misalnya `Cari produk...`). Tanpa langkah ini,
handler di bawah tidak akan pernah berjalan.

## Memulai Cepat

```typescript
import { Bot, InlineResults } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.on('inline_query', async ctx => {
    const query = ctx.update.inline_query.query; // yang diketik user setelah @botanda

    const results = InlineResults.builder()
        .article({
            id: 'salam',
            title: 'Kirim salam',
            description: `Menyapa dengan "${query}"`,
            text: `Halo! Anda mencari: ${query}`,
        })
        .photo({
            id: 'foto-acak',
            url: 'https://picsum.photos/400',
            caption: 'Foto acak',
        })
        .build();

    await ctx.answerInlineQuery(results, { cache_time: 10 });
});
```

Saat user mengetuk sebuah hasil, Telegram mengirim isinya ke chat sebagai pesan
"via @botanda". `answerInlineQuery` harus dipanggil dalam sekitar 10 detik.

## Aturan dari Telegram

- Maksimal **50 hasil** per jawaban. Muat lebih banyak dengan `next_offset` (lihat di bawah).
- Setiap `id` hasil harus unik dalam satu jawaban dan maksimal 64 byte.
- `cache_time` (detik, default 300) membuat Telegram memakai ulang jawaban untuk query
  yang sama. Pakai `is_personal: true` jika hasil bergantung pada siapa yang bertanya.

## Jenis Hasil

| Metode | Tipe Telegram | Opsi wajib |
| --- | --- | --- |
| `.article(opts)` | `InlineQueryResultArticle` | `id`, `title`, `text` |
| `.photo(opts)` | `InlineQueryResultPhoto` | `id`, `url` (JPEG) |
| `.document(opts)` | `InlineQueryResultDocument` | `id`, `title`, `document_url`, `mime_type` |
| `.video(opts)` | `InlineQueryResultVideo` | `id`, `title`, `video_url`, `mime_type`, `thumbnail_url` |
| `.gif(opts)` | `InlineQueryResultGif` | `id`, `gif_url` |
| `.voice(opts)` | `InlineQueryResultVoice` | `id`, `title`, `voice_url` |
| `.location(opts)` | `InlineQueryResultLocation` | `id`, `title`, `latitude`, `longitude` |
| `.venue(opts)` | `InlineQueryResultVenue` | `id`, `title`, `latitude`, `longitude`, `address` |
| `.contact(opts)` | `InlineQueryResultContact` | `id`, `phone_number`, `first_name` |

Setiap metode builder mengembalikan builder itu sendiri sehingga bisa dirangkai;
`.build()` mengembalikan array untuk `ctx.answerInlineQuery()`.

## Opsi Article

Article mengirim pesan teks. Ini jenis hasil yang paling umum.

```typescript
InlineResults.builder().article({
    id: 'faq-pengiriman', // unik, maksimal 64 byte
    title: 'Lama pengiriman', // baris pertama yang tebal di daftar hasil
    description: '2-5 hari kerja', // baris kedua berwarna abu-abu
    text: '<b>Pengiriman</b>: 2-5 hari kerja.', // pesan yang dikirim
    parse_mode: 'HTML',
    url: 'https://example.com/pengiriman', // link opsional di hasil
    thumbnail_url: 'https://example.com/icons/truk.png',
    reply_markup: { inline_keyboard: [[{ text: 'Lacak pesanan', url: 'https://example.com/lacak' }]] },
});
```

## Opsi Photo

```typescript
InlineResults.builder().photo({
    id: 'kucing-1',
    url: 'https://example.com/kucing.jpg', // JPEG; juga dipakai sebagai thumbnail secara default
    title: 'Kucing',
    caption: 'Kucing yang manis',
    photo_width: 800,
    photo_height: 600,
});
```

## Contoh: Pencarian Produk dengan Halaman

Input user dan nilai dari database harus di-escape sebelum masuk ke HTML; produk
bernama `Garam & Merica` akan membuat Telegram menolak pesannya.

```typescript
import { InlineResults, Markup } from 'vibegram';

const UKURAN_HALAMAN = 20;

bot.on('inline_query', async ctx => {
    const { query, offset } = ctx.update.inline_query;
    const halaman = Number(offset) || 0; // Telegram mengirim balik next_offset dari Anda

    const produk = await db.products.findMany({
        where: { name: { contains: query } },
        skip: halaman * UKURAN_HALAMAN,
        take: UKURAN_HALAMAN,
    });

    const builder = InlineResults.builder();
    for (const p of produk) {
        builder.article({
            id: `product_${p.id}`,
            title: p.name,
            description: `Rp${p.price} · stok ${p.stock}`,
            text: `<b>${Markup.escapeHTML(p.name)}</b>\nHarga: Rp${p.price}`,
            parse_mode: 'HTML',
            thumbnail_url: p.imageUrl,
        });
    }

    await ctx.answerInlineQuery(builder.build(), {
        cache_time: 30,
        is_personal: false,
        next_offset: produk.length === UKURAN_HALAMAN ? String(halaman + 1) : '', // '' = tidak ada halaman lagi
    });
});
```

## Mengetahui Hasil yang Dipilih

Untuk tahu hasil mana yang dikirim user (untuk analitik atau menghitung pemakaian),
aktifkan inline feedback dengan `/setinlinefeedback` di @BotFather lalu tangani
`chosen_inline_result`:

```typescript
bot.on('chosen_inline_result', ctx => {
    const { result_id, query } = ctx.update.chosen_inline_result;
    console.log(`Mengirim ${result_id} untuk "${query}"`);
});
```
