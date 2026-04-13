# Builder Inline Query

`InlineResults` menyediakan API fluent untuk membangun array hasil inline query — bertipe dan bersih.

## Memulai Cepat

```typescript
import { Bot, InlineResults } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.on('inline_query', async (ctx) => {
    const query = ctx.update.inline_query?.query || '';

    const hasil = InlineResults.builder()
        .article({
            id: '1',
            title: 'Halo Dunia',
            text: `Anda mencari: ${query}`,
            description: 'Kirim pesan salam'
        })
        .photo({
            id: '2',
            url: 'https://picsum.photos/400',
            caption: 'Foto acak'
        })
        .build();

    await ctx.answerInlineQuery(hasil, { cache_time: 10 });
});
```

## Tipe Hasil

| Metode | Tipe Telegram | Deskripsi |
|--------|--------------|-----------|
| `.article(opts)` | `InlineQueryResultArticle` | Artikel teks dengan judul |
| `.photo(opts)` | `InlineQueryResultPhoto` | Foto berdasarkan URL |
| `.document(opts)` | `InlineQueryResultDocument` | File dokumen |
| `.video(opts)` | `InlineQueryResultVideo` | Video berdasarkan URL |
| `.gif(opts)` | `InlineQueryResultGif` | GIF animasi |
| `.voice(opts)` | `InlineQueryResultVoice` | Pesan suara |
| `.location(opts)` | `InlineQueryResultLocation` | Lokasi geografis |
| `.venue(opts)` | `InlineQueryResultVenue` | Venue dengan alamat |
| `.contact(opts)` | `InlineQueryResultContact` | Kontak telepon |

## Opsi Article

```typescript
.article({
    id: string,           // ID hasil yang unik
    title: string,        // Judul hasil
    text: string,         // Teks pesan yang akan dikirim
    description?: string, // Subjudul yang ditampilkan
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2',
    url?: string,         // URL yang ditampilkan
    thumbnail_url?: string,
    reply_markup?: any    // Keyboard inline
})
```

## Opsi Photo

```typescript
.photo({
    id: string,
    url: string,            // URL foto
    thumbnail_url?: string, // Default: sama dengan url
    title?: string,
    caption?: string,
    parse_mode?: string,
    photo_width?: number,
    photo_height?: number,
    reply_markup?: any
})
```

## Berantai (Chaining)

Semua metode mengembalikan `this` untuk chaining yang lancar:

```typescript
const hasil = InlineResults.builder()
    .article({ id: '1', title: 'Pertama', text: 'Pesan 1' })
    .article({ id: '2', title: 'Kedua', text: 'Pesan 2' })
    .photo({ id: '3', url: 'https://contoh.com/gambar.jpg' })
    .gif({ id: '4', gif_url: 'https://contoh.com/animasi.gif' })
    .build();

console.log(hasil.length); // 4
```

## Contoh Praktis: Bot Pencarian

```typescript
bot.on('inline_query', async (ctx) => {
    const query = ctx.update.inline_query?.query?.toLowerCase() || '';

    // Cari di database
    const produk = await db.produk.findAll({
        where: { nama: { contains: query } },
        limit: 10,
    });

    const hasil = produk.reduce(
        (builder, p) => builder.article({
            id: `produk_${p.id}`,
            title: p.nama,
            text: `<b>${p.nama}</b>\nHarga: Rp${p.harga.toLocaleString()}`,
            description: `Rp${p.harga.toLocaleString()} • Stok: ${p.stok}`,
            parse_mode: 'HTML',
            thumbnail_url: p.gambarUrl,
        }),
        InlineResults.builder()
    ).build();

    await ctx.answerInlineQuery(hasil, {
        cache_time: 30,
        is_personal: true,
    });
});
```
