# Parse Mode

`@vibegram/parse-mode` membantu menyusun pesan Telegram berformat tanpa menulis HTML yang rawan atau escaping MarkdownV2 yang mudah rusak. Plugin ini menyediakan builder yang aman, helper link, middleware default parse mode, dan `ctx.replyFmt()`.

## Kapan Dipakai

Gunakan plugin ini saat pesan berisi nama user, ID, link, atau konten dinamis yang perlu dibuat bold, code, link, atau style lain secara aman.

Formatting Telegram cukup ketat. Escaping yang salah bisa membuat seluruh pesan gagal atau membuat teks user terbaca sebagai markup. Plugin ini meng-escape nilai plain secara default dan hanya membuat markup lewat helper eksplisit.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/parse-mode
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/parse-mode": "file:../vibegram/plugins/parse-mode"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { bold, code, fmt, parseMode } from '@vibegram/parse-mode';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(parseMode('HTML'));

bot.command('start', ctx => {
    return ctx.replyFmt(fmt`Halo ${bold(ctx.from?.first_name ?? 'there')}`);
});

bot.command('id', ctx => {
    return ctx.replyFmt(fmt`ID Anda adalah ${code(String(ctx.from?.id))}`);
});

await bot.launch();
```

## Builder HTML Aman

`fmt` adalah tagged template yang meng-escape string plain dan mempertahankan output helper:

```typescript
const name = '<script>alert(1)</script>';

const message = fmt`Selamat datang ${bold(name)}`;

await ctx.replyFmt(message);
```

Teks yang dikirim aman untuk HTML:

```html
Selamat datang <b>&lt;script&gt;alert(1)&lt;/script&gt;</b>
```

Helper HTML yang tersedia:

| Helper | Output |
| --- | --- |
| `bold(value)` | `<b>...</b>` |
| `italic(value)` | `<i>...</i>` |
| `underline(value)` | `<u>...</u>` |
| `strikethrough(value)` | `<s>...</s>` |
| `spoiler(value)` | `<tg-spoiler>...</tg-spoiler>` |
| `code(value)` | `<code>...</code>` |
| `pre(value, language?)` | `<pre><code>...</code></pre>` |
| `link(label, url)` | `<a href="...">...</a>` |

`link()` hanya menerima URL absolut dengan protocol `http`, `https`, `tg`, dan `mailto`.

## Builder MarkdownV2 Aman

Gunakan helper MarkdownV2 saat kamu memang membutuhkan output MarkdownV2:

```typescript
import {
    markdownBold,
    markdownCode,
    markdownFmt,
    markdownLink,
} from '@vibegram/parse-mode';

const message = markdownFmt`User ${markdownBold('A_B')} mengirim ${markdownCode('/start')}`;

await ctx.replyFmt(message);
```

Helper MarkdownV2 yang tersedia:

| Helper | Fungsi |
| --- | --- |
| `markdownFmt` | Tagged template dengan escaping MarkdownV2 |
| `markdownBold(value)` | Teks bold |
| `markdownItalic(value)` | Teks italic |
| `markdownCode(value)` | Inline code |
| `markdownLink(label, url)` | Link aman |

## Default Parse Mode

`parseMode(mode)` membungkus outgoing text dan caption call selama update saat ini:

```typescript
bot.use(parseMode('HTML'));

bot.command('plain', ctx => ctx.reply('Ini memakai parse_mode HTML.'));
bot.command('custom', ctx => ctx.reply('Ini tetap menang.', { parse_mode: 'MarkdownV2' }));
```

Nilai `parse_mode` eksplisit tidak pernah ditimpa.

## `ctx.replyFmt()`

Middleware menambahkan `ctx.replyFmt(formatted, extra?)`:

```typescript
bot.use(parseMode('HTML'));

bot.command('docs', ctx => {
    return ctx.replyFmt(
        fmt`Baca ${link('dokumentasi', 'https://alfandi09.github.io/vibegram/')}`,
        { disable_web_page_preview: true }
    );
});
```

Parse mode bawaan dari formatted value akan dipakai, jadi pesan `MarkdownV2` tetap dikirim sebagai `MarkdownV2` meskipun default middleware adalah `HTML`.

## TypeScript

Jika ingin context yang punya type `replyFmt()`, gunakan `ParseModeFlavor`:

```typescript
import type { Context } from 'vibegram';
import type { ParseModeFlavor } from '@vibegram/parse-mode';

type MyContext = ParseModeFlavor<Context>;
```

## Failure Modes

- Mencampur formatted value HTML di dalam `markdownFmt` melempar `TypeError`.
- Mencampur formatted value MarkdownV2 di dalam `fmt` melempar `TypeError`.
- URL tidak aman atau relatif melempar `TypeError`.
- Plugin ini memakai `parse_mode`, bukan array entity Telegram.

## Catatan Keamanan

- Masukkan input user sebagai nilai plain. Jangan menggabungkan raw markup secara manual.
- Gunakan `link(label, url)` dan `markdownLink(label, url)` daripada menulis link manual.
- Gunakan `escapeHtml()` atau `escapeMarkdownV2()` jika perlu escaping manual di luar builder.

## Validasi

Package ini punya test untuk HTML escaping, MarkdownV2 escaping, nested formatting, safe links, default parse mode middleware, dan `ctx.replyFmt()`.

```bash
npm run plugins:validate
npm run docs:build
```
