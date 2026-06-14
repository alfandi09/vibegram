# Changelog

Catatan rilis VibeGram. Halaman ini menyorot perubahan yang paling berguna untuk developer yang memakai framework ini.

Untuk log rilis lengkap, lihat repository [CHANGELOG.md](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md).

## 2.4.0

### Added

- **Bot API 10.1 — Rich Message**: `bot.sendRichMessage()`, `bot.sendRichMessageDraft()`, dan shortcut `ctx.replyWithRichMessage()`, plus keluarga tipe lengkap (`RichMessage`, `InputRichMessage`, `RichText`, `RichBlock`, serta seluruh 25 tipe elemen `RichText*` / 21 `RichBlock*`).
- **Bot API 10.1 — Join Request Query**: `bot.answerChatJoinRequestQuery()` dan `bot.sendChatJoinRequestWebApp()`, dengan field baru `User.supports_join_request_queries`, `ChatFullInfo.guard_bot`, dan `ChatJoinRequest.query_id`.
- **Bot API 10.1 — Poll**: tipe `Link` dan `InputMediaLink` (media link untuk opsi poll).
- Helper `Markup.escapeHTML()`, `Markup.escapeMarkdownV2()`, dan `Markup.escapeMarkdown()` untuk menyisipkan teks tak tepercaya ke pesan terformat dengan aman.
- Method opsional atomik `increment()` pada `RateLimitStore` untuk rate limiting bebas-race pada store async bersama (mis. Redis).

### Fixed

- **Konkurensi session**: middleware `session()` kini menserialkan muat/simpan per kunci, mencegah update hilang saat pengguna yang sama mengirim pesan bersamaan.
- **Timer queue**: `scheduleOnce()` tidak lagi meng-orphan timer saat handler-nya menjadwalkan ulang id yang sama, dan `scheduleInterval()` melewati run yang tumpang tindih.
- **Multipart**: karakter kontrol di-strip dari nama field multipart untuk mencegah header injection.
- **Eviksi LRU**: `MemoryCache` dan `MemorySessionStore` kini menyegarkan posisi saat dibaca, jadi eviksi benar-benar least-recently-used, bukan urutan penyisipan.

## 2.3.0

Dirilis pada 2026-06-05.

### Added

- Menambahkan cakupan type Bot API 10.0 untuk guest message, live photo, poll media, permission reaction chat, dan pengaturan akses managed bot.
- Menambahkan wrapper Bot API 10.0 untuk guest reply, live photo, cleanup reaction, pengaturan akses managed bot, dan lookup personal chat message.

### Security

- Menghapus eksposur dependency runtime `axios`, `form-data`, dan `follow-redirects` dengan memakai transport HTTP native dan serializer multipart internal VibeGram.

## 2.2.1

Dirilis pada 2026-05-22.

### Sorotan

- Membundel plugin Telegram Codex ke package utama `vibegram`.
- Menambahkan subpath publik `vibegram/codex` untuk `codex()`, `codexProvider()`, helper manual auth JSON, type memory store, dan helper provider.
- Publish tetap lewat alur rilis normal `vibegram`, bukan package terpisah `@vibegram/codex`.

### Penggunaan

```typescript
import { codex, codexProvider } from 'vibegram/codex';
```

## 2.1.0

Dirilis pada 2026-04-29.

### Sorotan

- Menambahkan plugin package `@vibegram/codex` untuk menghubungkan bot VibeGram ke session ChatGPT/Codex.
- Menambahkan helper `ctx.codex` untuk prompt, status provider, daftar model, reset percakapan, tracking penggunaan, dan personality per-user.
- Menambahkan command bawaan `/codex` untuk help, status, models, prompt eksplisit, reset, dan manajemen personality.
- Menambahkan dokumentasi Codex bahasa Inggris dan Indonesia dengan setup secret server-first, penanganan `auth.json`, langkah smoke test lokal, opsi provider, troubleshooting, dan panduan keamanan.
- Memperbarui `axios` ke `1.15.2`.

### Plugin Experimental Codex

Plugin Codex ditujukan untuk bot pribadi, eksperimen privat, dan internal tool. Plugin ini memakai session token Codex/ChatGPT dan mengarah ke backend ChatGPT Codex, bukan OpenAI API resmi.

Mulai dari sini:

- [Codex untuk Telegram](/id/plugins/codex)

### Validasi

- Typecheck package Codex pass.
- Test package Codex pass.
- Build package Codex pass.
- Build docs VitePress pass.

## 2.0.0

Dirilis pada 2026-04-27.

### Sorotan

- Merapikan breaking type untuk forwarded message, poll extras, dan metadata chat lengkap.
- Menambahkan opt-in network retry untuk Telegram client.
- Menambahkan health check untuk webhook adapter.
- Menambahkan native graceful webhook launch mode.
- Menambahkan `ConversationContext.waitForAny()`.
- Menambahkan `ctx.telegram` sebagai alias yang mudah ditemukan untuk scoped Telegram client.
- Menambahkan overload typed `guard()` middleware.
- Menambahkan public subpath exports untuk modul framework.
- Menambahkan cakupan method business, gifts, stories, dan monetization yang lebih luas.
- Membangun ulang pengalaman dokumentasi VitePress dengan navigasi responsif, local search, reusable docs components, dan sinkronisasi konten EN/ID.

### Migrasi

Baca changelog lengkap sebelum upgrade dari `1.x`, terutama jika bot Anda bergantung pada field forwarded-message lama, poll extras, atau bentuk return `getChat()`.

## 1.2.1

Dirilis pada 2026-04-25.

### Sorotan

- Menambahkan coverage `copy_text` yang hilang untuk `InlineKeyboardButton`.
- Menambahkan GitHub issue templates.
- Memperbarui metadata repository dan release.

## Riwayat Lengkap

Changelog lengkap berisi semua catatan rilis historis, detail validasi, dan catatan kompatibilitas:

- [Lihat CHANGELOG.md lengkap](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
- [Lihat package di npm](https://www.npmjs.com/package/vibegram)
