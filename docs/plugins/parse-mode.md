# Parse Mode

`@vibegram/parse-mode` helps you compose Telegram formatted messages without hand-writing unsafe HTML or fragile MarkdownV2 escaping. It provides escaped builders, safe link helpers, a default parse-mode middleware, and `ctx.replyFmt()`.

## When to Use

Use this plugin when messages include user-provided names, IDs, links, or dynamic content that should be bold, code formatted, linked, or styled safely.

Telegram formatting is strict. Bad escaping can break the whole message or accidentally treat user text as markup. This plugin escapes plain values by default and only emits markup through explicit helpers.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/parse-mode
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/parse-mode": "file:../vibegram/plugins/parse-mode"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { bold, code, fmt, parseMode } from '@vibegram/parse-mode';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(parseMode('HTML'));

bot.command('start', ctx => {
    return ctx.replyFmt(fmt`Hello ${bold(ctx.from?.first_name ?? 'there')}`);
});

bot.command('id', ctx => {
    return ctx.replyFmt(fmt`Your id is ${code(String(ctx.from?.id))}`);
});

await bot.launch();
```

## Safe HTML Builder

`fmt` is a tagged template that escapes plain strings and preserves helper output:

```typescript
const name = '<script>alert(1)</script>';

const message = fmt`Welcome ${bold(name)}`;

await ctx.replyFmt(message);
```

The sent text is safe HTML:

```html
Welcome <b>&lt;script&gt;alert(1)&lt;/script&gt;</b>
```

Available HTML helpers:

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

`link()` only accepts absolute `http`, `https`, `tg`, and `mailto` URLs.

## Safe MarkdownV2 Builder

Use MarkdownV2 helpers when you specifically need MarkdownV2 output:

```typescript
import {
    markdownBold,
    markdownCode,
    markdownFmt,
    markdownLink,
} from '@vibegram/parse-mode';

const message = markdownFmt`User ${markdownBold('A_B')} sent ${markdownCode('/start')}`;

await ctx.replyFmt(message);
```

Available MarkdownV2 helpers:

| Helper | Purpose |
| --- | --- |
| `markdownFmt` | Tagged template with MarkdownV2 escaping |
| `markdownBold(value)` | Bold text |
| `markdownItalic(value)` | Italic text |
| `markdownCode(value)` | Inline code |
| `markdownLink(label, url)` | Safe link |

## Default Parse Mode

`parseMode(mode)` wraps outgoing text and caption calls during the current update:

```typescript
bot.use(parseMode('HTML'));

bot.command('plain', ctx => ctx.reply('This uses HTML parse_mode.'));
bot.command('custom', ctx => ctx.reply('This wins.', { parse_mode: 'MarkdownV2' }));
```

Explicit `parse_mode` values are never overwritten.

## `ctx.replyFmt()`

The middleware adds `ctx.replyFmt(formatted, extra?)`:

```typescript
bot.use(parseMode('HTML'));

bot.command('docs', ctx => {
    return ctx.replyFmt(
        fmt`Read ${link('the docs', 'https://alfandi09.github.io/vibegram/')}`,
        { disable_web_page_preview: true }
    );
});
```

The formatted value's own parse mode is used, so `MarkdownV2` formatted messages still send as `MarkdownV2` even if the default middleware mode is `HTML`.

## TypeScript

If you want a typed context that includes `replyFmt()`, use `ParseModeFlavor`:

```typescript
import type { Context } from 'vibegram';
import type { ParseModeFlavor } from '@vibegram/parse-mode';

type MyContext = ParseModeFlavor<Context>;
```

## Failure Modes

- Mixing HTML formatted values inside `markdownFmt` throws a `TypeError`.
- Mixing MarkdownV2 formatted values inside `fmt` throws a `TypeError`.
- Unsafe or relative URLs throw a `TypeError`.
- The plugin uses `parse_mode`, not Telegram entity arrays.

## Security Notes

- Interpolate user input as plain values. Do not concatenate raw markup manually.
- Prefer `link(label, url)` and `markdownLink(label, url)` over hand-written links.
- Use `escapeHtml()` or `escapeMarkdownV2()` when you need manual escaping outside the builders.

## Validation

The package includes tests for HTML escaping, MarkdownV2 escaping, nested formatting, safe links, default parse mode middleware, and `ctx.replyFmt()`.

```bash
npm run plugins:validate
npm run docs:build
```
