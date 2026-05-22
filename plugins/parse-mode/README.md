# @vibegram/parse-mode

Safe Telegram parse-mode formatting helpers for VibeGram bots.

This package provides escaped HTML and MarkdownV2 builders, safe link helpers, a default parse-mode middleware, and `ctx.replyFmt()` for formatted replies.

## Install

```bash
npm install vibegram @vibegram/parse-mode
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/parse-mode": "file:../vibegram/plugins/parse-mode"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { bold, code, fmt, link, parseMode } from '@vibegram/parse-mode';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(parseMode('HTML'));

bot.command('start', ctx => {
    return ctx.replyFmt(fmt`Hello ${bold(ctx.from?.first_name ?? 'there')}`);
});

bot.command('id', ctx => {
    return ctx.replyFmt(fmt`Your id is ${code(String(ctx.from?.id))}`);
});

bot.command('docs', ctx => {
    return ctx.replyFmt(fmt`Open ${link('VibeGram docs', 'https://alfandi09.github.io/vibegram/')}`);
});
```

## Exports

| Export | Purpose |
| --- | --- |
| `fmt`, `htmlFmt` | Safe HTML tagged template |
| `bold`, `italic`, `underline`, `strikethrough`, `spoiler`, `code`, `pre`, `link` | HTML formatting helpers |
| `markdownFmt` | Safe MarkdownV2 tagged template |
| `markdownBold`, `markdownItalic`, `markdownCode`, `markdownLink` | MarkdownV2 formatting helpers |
| `escapeHtml`, `escapeMarkdownV2` | Explicit escaping helpers |
| `parseMode(mode)` | Middleware for default parse mode and `ctx.replyFmt()` |
| `ParseModeFlavor<C>` | Optional TypeScript flavor for contexts with `replyFmt()` |

## Validation

```bash
npm run typecheck
npm test
npm run build
```
