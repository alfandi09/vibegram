# Telegram API Sync Checklist

Checklist ini merangkum patch per file untuk menyelaraskan VibeGram dengan Telegram Bot API terbaru berdasarkan audit runtime, types, dan helper publik.

Prinsip eksekusi:

1. Dahulukan perubahan yang hanya menambah type dan helper baru.
2. Hindari rename breaking sampai ada alias atau migration note yang jelas.
3. Naikkan klaim docs hanya setelah type, helper, dan tests sudah benar-benar sinkron.

## Urutan Pengerjaan

1. `src/types.ts`
2. `src/context.ts`
3. `src/bot.ts`
4. `src/adapters.ts`
5. `README.md` dan docs claim parity
6. test coverage untuk feature family baru

## `src/types.ts`

### High Priority

- [ ] Tambahkan type family reactions:
      `ReactionType`, `ReactionTypeEmoji`, `ReactionTypeCustomEmoji`, `ReactionTypePaid`, `MessageReactionUpdated`, `MessageReactionCountUpdated`.
- [ ] Ganti `Update.message_reaction` dan `Update.message_reaction_count` dari `any` ke type resmi.
- [ ] Tambahkan type family business:
      `BusinessConnection`, `BusinessBotRights`, `BusinessMessagesDeleted`.
- [ ] Ganti `Update.business_connection` dan `Update.deleted_business_messages` dari `any` ke type resmi.
- [ ] Tambahkan type family checklist:
      `Checklist`, `ChecklistTask`, dan service/update payload terkait jika tersedia di docs resmi.
- [ ] Ganti `Message.checklist` dari `any` ke type resmi.
- [ ] Tambahkan type family paid media:
      `PaidMediaInfo`, `PaidMediaPurchased`, dan varian media terkait.
- [ ] Ganti `Message.paid_media` dan `Update.purchased_paid_media` dari `any` ke type resmi.
- [ ] Perbaiki managed bot update shape agar sesuai docs resmi terbaru.
- [ ] Tambahkan managed bot update ke tipe `Update` dengan nama field yang benar.

### Medium Priority

- [ ] Tambahkan `DirectMessagesTopic` dan ganti `Message.direct_messages_topic` dari `any`.
- [ ] Tambahkan `MessageOrigin`, `ExternalReplyInfo`, `TextQuote`, `Story` agar `forward_origin`, `external_reply`, `quote`, `story`, `reply_to_story` tidak lagi `any`.
- [ ] Tambahkan `sender_business_bot` ke `Message`.
- [ ] Tambahkan type `WriteAccessAllowed` dan ganti `write_access_allowed` yang saat ini salah memakai `WebAppData`.
- [ ] Lengkapi `PollAnswer` dan perbarui `Update.poll_answer` dari `any`.
- [ ] Lengkapi `Poll` dan `PollOption` dengan field terbaru seperti `description`, `description_entities`, `persistent_id`, dan field lifecycle option jika memang ada pada docs current.
- [ ] Lengkapi `User` dengan capability modern yang belum ada, terutama business/main web app/topics jika memang current di docs.
- [ ] Lengkapi `Chat` dengan metadata modern yang masih hilang, terutama direct messages/business/gift/stars fields yang relevan dan stabil di docs.

### Low Priority

- [ ] Tambahkan family type gifts/stars/revenue bila memang ingin mengklaim parity modern economy secara penuh.
- [ ] Ganti placeholder `any` lain yang masih tersisa pada `managed_bot`, `gifts`, `stars`, `suggested_post` sesuai prioritas produk.

### Rename / Compatibility Review

- [ ] Audit field service message yang namanya stale atau beda dengan docs terbaru.
- [ ] Putuskan apakah rename dilakukan langsung atau dengan alias sementara di type layer.

## `src/context.ts`

### High Priority

- [ ] Tambahkan helper `editMessageMedia()`.
- [ ] Tambahkan helper `editMessageLiveLocation()`.
- [ ] Tambahkan helper `stopMessageLiveLocation()`.
- [ ] Tambahkan dukungan typed extra params modern yang belum surfaced, terutama:
      `direct_messages_topic_id`, `allow_paid_broadcast`, `suggested_post_parameters` jika berlaku untuk metode terkait.
- [ ] Pastikan helper yang terkait business mode konsisten mengirim `business_connection_id` bila method Telegram memang mendukungnya.

### Medium Priority

- [ ] Audit `replyWithInvoice()` agar parity business/send params konsisten dengan helper lain.
- [ ] Perluas `ctx.chat` / `ctx.from` / getter turunan lain agar mendukung update family modern yang sekarang belum terpetakan, terutama:
      reactions, deleted business messages, managed bot updates.
- [ ] Audit helper reply/edit lain apakah ada method Telegram modern yang masih belum punya shortcut padahal sudah diklaim di docs/changelog.
- [ ] Tambahkan helper untuk `chosen_inline_result` hanya jika memang ingin DX lebih tinggi; kalau tidak, dokumentasikan raw update access sebagai intentional.

### DX Review

- [ ] Pastikan seluruh helper baru terdokumentasi di `docs/api/context.md`.
- [ ] Tambahkan contoh penggunaan untuk helper modern yang baru ditambah.

## `src/bot.ts`

### High Priority

- [ ] Tambahkan update type modern yang valid ke union `UpdateType` jika docs latest memang mendukungnya dan runtime repo ingin menerimanya lewat `allowed_updates`.
- [ ] Sinkronkan `UpdateType` dengan nama field terbaru untuk managed bot updates.
- [ ] Pastikan `polling.allowed_updates` bisa mengekspresikan semua update modern yang memang sudah didukung runtime.

### Medium Priority

- [ ] Audit klaim “full Bot API v9.6 coverage” terhadap `Bot` runtime surface dan turunkan wording bila masih ada gap signifikan.
- [ ] Tambahkan test untuk `allowed_updates` modern setelah union diperbarui.

## `src/adapters.ts`

### Medium Priority

- [ ] Verifikasi docs adapter terhadap behavior aktual untuk update modern dan error responses.
- [ ] Tambahkan note atau support eksplisit jika ada constraint adapter untuk payload Telegram terbaru.

## `README.md`

### High Priority

- [ ] Revisi klaim parity dari “Full Bot API v9.6 Coverage” jika type/helper/runtime belum benar-benar lengkap.
- [ ] Setelah sinkronisasi selesai, update klaim kembali dengan angka/helper/coverage yang akurat.

### Medium Priority

- [ ] Tambahkan note singkat bahwa feature family modern tertentu masih in progress jika belum semua selesai dalam satu release.

## `docs/index.md`

- [ ] Samakan wording landing page dengan status parity aktual.

## `docs/basics/introduction.md`

- [ ] Samakan bagian “What’s New” dan klaim coverage dengan status implementasi sesungguhnya.

## `docs/api/context.md`

### High Priority

- [ ] Tambahkan helper yang sudah ada tetapi belum terdokumentasi penuh, seperti checklist/paid media/helper modern lain.
- [ ] Dokumentasikan helper baru yang ditambahkan pada patch sinkronisasi (`editMessageMedia`, live location helpers, dst).

## `docs/core/handling.md`

- [ ] Tambahkan contoh listener/update modern yang memang didukung runtime setelah `UpdateType` diperluas.
- [ ] Hindari mencantumkan update yang belum typed dengan baik tanpa catatan.

## Tests To Add or Expand

### `tests/context.test.ts`

- [ ] Tambahkan test untuk helper baru: media edit, live location edit/stop, modern reply params.
- [ ] Tambahkan test getter `ctx.chat` / `ctx.from` untuk update modern yang baru disupport.

### `tests/types` coverage strategy

- [ ] Tambahkan type-oriented smoke tests atau compile-time fixtures untuk memastikan field modern tidak drift lagi.

### `tests/bot.test.ts`

- [ ] Tambahkan test `allowed_updates` untuk union modern.

### `tests/adapters.test.ts`

- [ ] Tambahkan regresi untuk update modern yang butuh parsing/runtime behavior khusus jika ada.

## Definition of Done

- [ ] `src/types.ts` tidak lagi punya `any` pada family modern prioritas tinggi.
- [ ] `Context` punya helper modern minimum untuk edit media dan live location.
- [ ] `UpdateType` sinkron dengan update modern yang benar-benar diakui runtime.
- [ ] README/docs tidak overclaim parity.
- [ ] Tests baru mencakup helper dan update modern utama.
- [ ] `npm test`, `npm run test:coverage`, `npm run typecheck`, `npm run typecheck:test`, `npm run typecheck:examples`, dan `npm run docs:build` tetap hijau.
