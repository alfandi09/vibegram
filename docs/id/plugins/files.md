# Files

`@vibegram/files` menambahkan helper file praktis untuk pesan media Telegram. Plugin ini mengambil file dari message saat ini, memanggil Telegram `getFile`, membuat URL download, lalu bisa download ke buffer, stream, path lokal, atau custom storage adapter.

## Aturan Resmi Telegram

Download file Bot API Telegram bekerja dalam dua langkah:

1. Panggil `getFile` dengan `file_id`.
2. Download `file_path` dari `https://api.telegram.org/file/bot<token>/<file_path>`.

Pada public Bot API server, bot bisa mengunduh file sampai 20 MB. Telegram menyebut link yang dibuat valid minimal 1 jam. Response `getFile` bisa tidak mempertahankan nama file dan MIME type asli, jadi plugin ini tetap menyimpan metadata dari message asli jika tersedia.

Jika memakai local Bot API server, `file_path` bisa berupa path lokal absolut, bukan URL remote. Dalam mode itu, gunakan path tersebut langsung atau copy dari disk.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/files
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/files": "file:../vibegram/plugins/files"
  }
}
```

## Penggunaan Minimal

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
    await ctx.reply(`Tersimpan: ${file.safeFileName()}`);
});

await bot.launch();
```

## File Message yang Didukung

`ctx.file()` mengambil file message saat ini dari:

| Field message | Kind |
| --- | --- |
| `photo` | `photo`, ukuran terbesar yang tersedia |
| `document` | `document` |
| `video` | `video` |
| `audio` | `audio` |
| `voice` | `voice` |
| `video_note` | `video_note` |
| `animation` | `animation` |
| `sticker` | `sticker` |

Kamu juga bisa memakai `file_id` eksplisit:

```typescript
const file = await ctx.file({ fileId: knownFileId, kind: 'document' });
```

## Helper Download

```typescript
const file = await ctx.file();

const url = file.getUrl();
const buffer = await file.toBuffer();
const stream = await file.toStream();
const path = await file.saveTo('uploads/report.pdf');
const safePath = await file.saveToDir('uploads');
```

`saveToDir()` memakai `file.safeFileName()` dan membersihkan nama seperti `../bad:name?.pdf` sebelum menulis file.

## Guard

Batasi ukuran dan tipe file di level middleware:

```typescript
bot.use(files({
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.png'],
}));
```

Atau override per call:

```typescript
const file = await ctx.file({
    maxBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf'],
});
```

Plugin mengecek ukuran dari message, ukuran dari `getFile`, HTTP `content-length`, dan jumlah byte saat stream disimpan.

## Custom Storage

Gunakan `uploadTo(adapter)` untuk S3, R2, MinIO, atau object storage sendiri:

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

Adapter menerima `{ file, stream, fileName, mimeType, size }`.

## Options

| Option | Default | Deskripsi |
| --- | --- | --- |
| `token` | `ctx.client.token` | Token bot untuk membuat URL file Telegram |
| `apiRoot` | `https://api.telegram.org` | Root Bot API, berguna untuk deployment custom/local |
| `maxBytes` | `20 MB` | Ukuran download maksimum |
| `allowedMimeTypes` | kosong | Allowlist MIME type dari message |
| `allowedExtensions` | kosong | Allowlist ekstensi file asli |
| `fetch` | `globalThis.fetch` | Implementasi fetch custom untuk test atau runtime khusus |

## Failure Modes

- `FileNotFoundError`: tidak ada media yang didukung di update ini.
- `FileSizeLimitError`: ukuran diketahui atau ukuran download melebihi `maxBytes`.
- `FileTypeNotAllowedError`: MIME type atau ekstensi tidak diizinkan.
- `FileDownloadError`: `file_path` kosong, token kosong, HTTP download gagal, atau path local Bot API dipakai dengan helper download remote.

## Catatan Keamanan

- Jangan percaya nama file dari user. Gunakan `safeFileName()` atau `saveToDir()`.
- Jaga `maxBytes` tetap terbatas untuk bot publik.
- Validasi MIME type dan ekstensi sebelum memproses file.
- Scan atau isolasi upload user sebelum diberikan ke parser, OCR, ekstraksi arsip, atau model AI.
- Jangan log URL file Telegram penuh karena URL itu mengandung token bot.

## Validasi

Package ini punya test untuk resolusi media, `getFile`, pembuatan URL, download buffer/stream, save lokal, size guard, MIME guard, dan sanitasi nama file.

```bash
npm run plugins:validate
npm run docs:build
```
