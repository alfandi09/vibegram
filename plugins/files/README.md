# @vibegram/files

Telegram file helpers for VibeGram bots.

This package adds `ctx.file()` and returns a `TelegramDownloadableFile` with helpers for URLs, buffers, streams, local saves, safe filenames, and custom storage adapters.

## Install

```bash
npm install vibegram @vibegram/files
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/files": "file:../vibegram/plugins/files"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { files } from '@vibegram/files';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(files({
    maxBytes: 20 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
}));

bot.on('message:document', async ctx => {
    const file = await ctx.file();
    const savedPath = await file.saveToDir('uploads');
    await ctx.reply(`Saved: ${file.safeFileName()}`);
});
```

## Exports

| Export | Purpose |
| --- | --- |
| `files(options?)` | Middleware that installs `ctx.file()` |
| `TelegramDownloadableFile` | Downloadable file wrapper |
| `sanitizeFileName()` | Safe local filename helper |
| `FileNotFoundError` | No media found on the update |
| `FileSizeLimitError` | File exceeds configured limit |
| `FileTypeNotAllowedError` | MIME or extension is not allowed |
| `FileStorageAdapter` | Generic adapter contract for S3/R2/custom storage |

## Validation

```bash
npm run typecheck
npm test
npm run build
```
