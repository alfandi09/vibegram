# Rich Message

Rich message (Bot API 10.1+) adalah dokumen berisi heading, list, tabel, kutipan,
media, dan baris tombol. Bisa disusun dari sumber HTML/Markdown atau, sejak Bot API
10.2, dari block bertipe. `Rich` adalah builder fluent untuk bentuk block.

```typescript
import { Rich } from 'vibegram';

const url = 'https://example.com/changelog';

await ctx.replyWithRichMessage(
    Rich.message()
        .heading('Rilis 3.0', 1)
        .paragraph(['Kini dengan pesan ', Rich.bold('rich'), '. ', Rich.link('Selengkapnya', url)])
        .list(['Lebih cepat', 'Lebih kecil', 'Bertipe penuh'])
        .table(
            [
                ['Paket', 'Harga'],
                ['Gratis', 'Rp0'],
                ['Pro', 'Rp75.000'],
            ],
            { header: true, compact: true }
        )
        .expandableQuote('Cerita panjang di balik rilis ini...')
        .buttons([{ text: 'Buka changelog', url }], 'center')
        .build()
);
```

## Block

| Metode | Block |
| --- | --- |
| `paragraph(text)`, `heading(text, size?)`, `footer(text)` | Block teks (ukuran heading 1-6). |
| `code(text, language?)`, `math(latex)`, `divider()`, `anchor(name)` | Kode, LaTeX, pemisah, anchor. |
| `list(items)`, `orderedList(items, style?)`, `checklist([[text, checked]])` | List; item berupa rich text atau array block. |
| `quote(content, credit?)`, `expandableQuote(text, credit?)`, `pullQuote(text, credit?)` | Kutipan. |
| `details(summary, content, open?)` | Bagian yang bisa dilipat. |
| `table(rows, { header, bordered, striped, compact, caption })` | Tabel; sel berupa rich text atau `RichBlockTableCell`. |
| `buttons(buttons, align?)` | Baris 1-8 tombol (`RichMessageButton`). |
| `photo`, `video`, `animation`, `audio`, `document`, `voiceNote` | Media dari string `file_id`/URL atau objek `InputMedia*`, dengan caption opsional. |
| `map(location, { zoom, width, height, caption })` | Block peta. |
| `thinking(text?)` | Placeholder "Thinking...", hanya untuk `sendRichMessageDraft`. |
| `block(block)` | `InputRichBlock` mentah apa pun. |

`rightToLeft()` dan `skipEntityDetection()` mengatur flag pesan; `build()` mengembalikan
`InputRichMessage` dan melempar error jika belum ada block.

## Teks inline

`Rich.bold`, `Rich.italic`, `Rich.underline`, `Rich.strike`, `Rich.spoiler`,
`Rich.code`, `Rich.link(text, url)`, `Rich.mention(text, username)`,
`Rich.userMention(text, user)`, `Rich.customEmoji(id, fallback)`, dan
`Rich.button(button)` mengembalikan elemen `RichText`. Gabungkan dalam array:
`['Halo ', Rich.bold('dunia')]`.

## Media dari upload

Rujuk file yang di-upload dari HTML/Markdown dengan link `tg://photo?id=` dan field
`media`, atau berikan objek `InputMedia*` dengan upload `{ source, filename }`
langsung ke block media.
