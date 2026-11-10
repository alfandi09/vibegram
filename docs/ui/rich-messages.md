# Rich Messages

Rich messages (Bot API 10.1+) are documents with headings, lists, tables, quotes,
media, and button rows. Build them from HTML/Markdown source or, since Bot API 10.2,
from typed blocks. `Rich` is a fluent builder for the block form.

```typescript
import { Rich } from 'vibegram';

const url = 'https://example.com/changelog';

await ctx.replyWithRichMessage(
    Rich.message()
        .heading('Release 3.0', 1)
        .paragraph(['Now with ', Rich.bold('rich'), ' messages. ', Rich.link('Read more', url)])
        .list(['Faster', 'Smaller', 'Fully typed'])
        .table(
            [
                ['Plan', 'Price'],
                ['Free', '$0'],
                ['Pro', '$5'],
            ],
            { header: true, compact: true }
        )
        .expandableQuote('The long story behind this release...')
        .buttons([{ text: 'Open changelog', url }], 'center')
        .build()
);
```

## Blocks

| Method | Block |
| --- | --- |
| `paragraph(text)`, `heading(text, size?)`, `footer(text)` | Text blocks (heading size 1-6). |
| `code(text, language?)`, `math(latex)`, `divider()`, `anchor(name)` | Code, LaTeX, separators, anchors. |
| `list(items)`, `orderedList(items, style?)`, `checklist([[text, checked]])` | Lists; items are rich text or arrays of blocks. |
| `quote(content, credit?)`, `expandableQuote(text, credit?)`, `pullQuote(text, credit?)` | Quotations. |
| `details(summary, content, open?)` | Collapsible section. |
| `table(rows, { header, bordered, striped, compact, caption })` | Tables; cells are rich text or `RichBlockTableCell`. |
| `buttons(buttons, align?)` | Row of 1-8 buttons (`RichMessageButton`). |
| `photo`, `video`, `animation`, `audio`, `document`, `voiceNote` | Media from a `file_id`/URL string or an `InputMedia*` object, with optional caption. |
| `map(location, { zoom, width, height, caption })` | Map block. |
| `thinking(text?)` | "Thinking..." placeholder, for `sendRichMessageDraft` only. |
| `block(block)` | Any raw `InputRichBlock`. |

`rightToLeft()` and `skipEntityDetection()` set message flags; `build()` returns an
`InputRichMessage` and throws if no block was added.

## Inline text

`Rich.bold`, `Rich.italic`, `Rich.underline`, `Rich.strike`, `Rich.spoiler`,
`Rich.code`, `Rich.link(text, url)`, `Rich.mention(text, username)`,
`Rich.userMention(text, user)`, `Rich.customEmoji(id, fallback)`, and
`Rich.button(button)` return `RichText` elements. Combine them in arrays:
`['Hello ', Rich.bold('world')]`.

## Media from uploads

Reference uploaded files from HTML/Markdown with `tg://photo?id=` links and the
`media` field, or pass `InputMedia*` objects with `{ source, filename }` uploads
directly to the media blocks.
