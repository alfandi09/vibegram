# Upgrade ke 3.0

vibegram 3.0 sebagian besar berisi tambahan. Ada tiga perubahan yang bisa merusak
proyek lama; masing-masing cukup beberapa menit untuk diperbaiki.

## Perubahan breaking

### 1. Node.js 20 atau lebih baru

Node.js 18 sudah end of life sejak April 2025, jadi 3.0 membutuhkan Node.js 20+
(`engines: { node: ">=20" }`). Upgrade runtime di server dan di CI.

### 2. Codex dipindah ke `@vibegram/codex`

Plugin ChatGPT/Codex tidak lagi dibundel di package inti. Install terpisah lalu ganti
path import-nya; API-nya tidak berubah.

```bash
npm install @vibegram/codex
```

```diff
- import { codex, codexProvider } from 'vibegram/codex';
+ import { codex, codexProvider } from '@vibegram/codex';
```

Package inti jadi lebih kecil, dan proyek yang tidak memakai Codex tidak lagi membawa
kode session dan auth-nya.

### 3. Alias deprecated dihapus

| Dihapus | Gunakan |
| --- | --- |
| `ctx.replyWithDraft(text, { random_id })` | `{ draft_id }` (integer bukan nol). `random_id` memang bukan parameter Bot API. |
| `Gift.gift_id` | `Gift.id`, sesuai Bot API. (`UniqueGift.gift_id` tidak berubah.) |

### Koreksi tipe

Koreksi ini masuk di siklus rilis yang sama dan bisa muncul sebagai error compile pada
kode yang bergantung pada tipe lama yang salah (nilai runtime tidak berubah):

- `ctx.copyMessages()` / `ctx.forwardMessages()` mengembalikan `MessageId[]`, bukan `number[]`.
- `bot.setGameScore()` mengembalikan `Message | true`, bukan `boolean`.

## Default yang tidak berubah

`commandsOnEditedMessages` tetap `true`, jadi command tetap berjalan saat user mengedit
pesan command lama. Pakai `new Bot(token, { commandsOnEditedMessages: false })` untuk
mematikannya.

## Baru di 3.0

- [Bot API 10.3](/id/api/bot-methods#metode-bot-api-103): ephemeral message, rich message berbasis block, community, tombol stop draft.
- [Filter query](/id/core/handling#filter-query) yang mempersempit tipe: `bot.on('message:photo', ...)`.
- [Kombinator Composer](/id/core/middleware#kombinator): `filter`, `branch`, `route`, `errorBoundary`, `chatType`, `reaction`, dan lainnya.
- [Edge runtime](/id/adapters/fetch): `createFetchHandler()` untuk Cloudflare Workers, Deno, Bun, dan Next.js.
- [Durable conversation](/id/state/durable-conversations) yang tahan restart.
- [Testing kit](/id/advanced/testing): `vibegram/testing`.
- [AI streaming](/id/advanced/streaming) dengan draft dan tombol stop, serta [builder Rich](/id/ui/rich-messages).
- Template proyek `npm create vibegram@latest`.
- Upload menyimpan nama file (`{ source, filename }`), `apiRoot` untuk Local Bot API Server, dan banyak perbaikan keandalan. Lihat [changelog](/id/changelog).
