# Files

`@vibegram/files` adds practical file helpers for Telegram media messages. It resolves the current message file, calls Telegram `getFile`, builds a download URL, and can download to a buffer, stream, local path, or custom storage adapter.

## Official Telegram Rules

Telegram Bot API file downloads work in two steps:

1. Call `getFile` with a `file_id`.
2. Download `file_path` from `https://api.telegram.org/file/bot<token>/<file_path>`.

On the public Bot API server, bots can download files up to 20 MB. Telegram says the generated link is valid for at least 1 hour. The `getFile` response may not preserve original file name or MIME type, so this plugin keeps the metadata from the original message when it is available.

If you use a local Bot API server, `file_path` can be an absolute local path instead of a remote URL. In that mode, use the returned path directly or copy it from disk.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/files
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/files": "file:../vibegram/plugins/files"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { files } from '@vibegram/files';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(files());

bot.on('message:document', async ctx => {
    const file = await ctx.file();
    await file.saveToDir('uploads');
    await ctx.reply(`Saved ${file.safeFileName()}`);
});

await bot.launch();
```

## Supported Message Files

`ctx.file()` resolves the current message file from:

| Message field | Kind |
| --- | --- |
| `photo` | `photo`, largest available size |
| `document` | `document` |
| `video` | `video` |
| `audio` | `audio` |
| `voice` | `voice` |
| `video_note` | `video_note` |
| `animation` | `animation` |
| `sticker` | `sticker` |

You can also request an explicit `file_id`:

```typescript
const file = await ctx.file({ fileId: knownFileId, kind: 'document' });
```

## Download Helpers

```typescript
const file = await ctx.file();

const url = file.getUrl();
const buffer = await file.toBuffer();
const stream = await file.toStream();
const path = await file.saveTo('uploads/report.pdf');
const safePath = await file.saveToDir('uploads');
```

`saveToDir()` uses `file.safeFileName()` and sanitizes names such as `../bad:name?.pdf` before writing.

## Guards

Set size and type restrictions at middleware level:

```typescript
bot.use(files({
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.png'],
}));
```

Or override per call:

```typescript
const file = await ctx.file({
    maxBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf'],
});
```

The plugin checks known file size from the message, file size from `getFile`, HTTP `content-length`, and streamed bytes while saving.

## Custom Storage

Use `uploadTo(adapter)` for S3, R2, MinIO, or your own object storage:

```typescript
const adapter = {
    async put({ stream, fileName, mimeType }) {
        const key = `telegram/${fileName}`;
        await bucket.put(key, stream, { httpMetadata: { contentType: mimeType } });
        return { key };
    },
};

const result = await file.uploadTo(adapter);
```

The adapter receives `{ file, stream, fileName, mimeType, size }`.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `token` | `ctx.client.token` | Bot token used to build Telegram file URLs |
| `apiRoot` | `https://api.telegram.org` | Bot API root, useful for custom/local deployments |
| `maxBytes` | `20 MB` | Maximum download size |
| `allowedMimeTypes` | none | Allowlist for message MIME type |
| `allowedExtensions` | none | Allowlist for original file extension |
| `fetch` | `globalThis.fetch` | Custom fetch implementation for tests or custom runtimes |

## Failure Modes

- `FileNotFoundError`: no supported media exists on this update.
- `FileSizeLimitError`: known or downloaded size exceeds `maxBytes`.
- `FileTypeNotAllowedError`: MIME type or extension is not allowed.
- `FileDownloadError`: missing `file_path`, missing token, failed HTTP download, or local Bot API path used with remote download helpers.

## Security Notes

- Never trust user-supplied file names. Use `safeFileName()` or `saveToDir()`.
- Keep `maxBytes` bounded for public bots.
- Validate MIME type and extension before processing files.
- Scan or isolate user uploads before passing them to parsers, OCR, archive extraction, or AI models.
- Do not log full Telegram file URLs because they include the bot token.

## Validation

The package includes tests for media resolution, `getFile`, URL creation, buffer/stream downloads, local save, file-size guards, MIME guards, and filename sanitization.

```bash
npm run plugins:validate
npm run docs:build
```
