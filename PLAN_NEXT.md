# PLAN_NEXT.md - Vibegram Next Update Plan

> Dibuat: 2026-04-25
> Basis audit: PLAN.md buatan Claude + kondisi repo setelah publish `vibegram@1.2.0`.
> Tujuan: memisahkan item yang sudah selesai di `1.2.0` dari backlog update berikutnya.

---

## Release Snapshot

- npm latest: `1.2.1`
- Commit fitur utama: `e5f5ebe feat: expand Bot API coverage and harden runtime safety`
- Commit koreksi versi: `613c349 chore: bump version to 1.2.0`
- Phase A patch hygiene: released as `1.2.1` via `bd9ad6c fix: prepare 1.2.1 patch release`.
- Phase B security/stability: implemented locally without version bump.
- Phase C developer experience: implemented locally without version bump.
- Phase D API coverage: implemented locally without version bump.
- `1.1.0` harus dianggap burned. npm menolak publish dengan pesan versi pernah dipublish, walau daftar versi saat itu belum menampilkannya.
- Versi yang harus dihindari: `1.0.0-rc.1`, `1.0.0-rc.2`, `1.0.0`, `1.0.1`, `1.1.0`, `1.1.1`, `1.1.2`, `1.2.0`, `1.2.1`.
- Kandidat versi berikut:
    - `1.2.2` untuk bug/security/doc-only patch.
    - `1.3.0` untuk fitur backward-compatible.
    - `2.0.0` untuk breaking changes seperti menghapus field deprecated atau mengganti HTTP layer.

---

## Selesai di 1.2.0

### Security and Runtime Hardening

- Token redaction pada Axios error config, response config, dan message.
- Session clone aman dari `__proto__`, `constructor`, dan `prototype`.
- Webhook secret token memakai shared constant-time comparison.
- `SECURITY.md` ditambahkan.

### Bug Fixes and DX

- README tidak lagi merujuk `meta/*`.
- `isForwarded` memakai `forward_origin` dengan fallback legacy `forward_date`.
- `Wizard.back()` dan `Wizard.goto(step)` ditambahkan.
- `Scene.reenter()` ditambahkan.
- Context reply/media helpers auto-propagate `message_thread_id`.
- `ctx.replyQuote()` ditambahkan.
- `Composer.start()`, `Composer.help()`, dan `Composer.settings()` ditambahkan.

### Type and API Coverage

- `ChatFullInfo`, modern `MessageOrigin*`, `MaybeInaccessibleMessage`, `InputProfilePhoto`, `VideoQuality`, `UserProfileAudios`, `ChatOwnerLeft`, `ChatOwnerChanged`, `PreparedKeyboardButton`, `PollOptionAdded`, dan `PollOptionDeleted` ditambahkan.
- Bot management wrappers ditambahkan, termasuk `logOut`, `close`, bot name/description/menu/admin-rights/profile-photo/profile-audio helpers.
- Context wrappers ditambahkan untuk invite links, forum tools, multi-message operations, chat admin, poll stop, stickers, and checklist edit.
- Payment, Web App, passport, and game wrappers ditambahkan.

### Docs and Release

- Quickstart, migration, and deployment docs EN/ID ditambahkan.
- VitePress sidebar diperbarui.
- README badges, security section, dan comparison wording diperbaiki.
- CONTRIBUTING.md diperbarui.
- `package.json` description diubah dari `Full` ke `Broad`.

---

## Belum Dilakukan Dari PLAN.md Lama

### Security and Stability

- [x] `rateLimit()` fallback untuk update tanpa `from` atau tanpa `chat`.
    - File: `src/ratelimit.ts`
    - Default key sekarang fallback bertingkat `chat+from`, `chat`, `from`, lalu `update_id`.
    - Opsi `strictMode` ditambahkan untuk memblok update tanpa key.

- [x] Validasi payload `TelegramClient.callApi()`.
    - File: `src/client.ts`
    - Root payload wajib plain object jika disediakan.
    - JSON payload non-multipart dibatasi lewat `maxJsonPayloadBytes`, default 50MB.
    - Multipart upload tetap form-encoded dan tidak dihitung sebagai JSON payload.

- [x] `ConversationManager.cancelAll()`.
    - File: `src/conversation.ts`
    - Berguna untuk graceful shutdown custom persistence.

- [x] Periodic cleanup untuk `MemorySessionStore`.
    - File: `src/session.ts`
    - `cleanupExpired()` dan `close()` ditambahkan.
    - Constructor punya `cleanupIntervalMs`, default 60 detik dan bisa dimatikan dengan `0`.

### Type Correctness

- [ ] Split `Chat` vs `ChatFullInfo` secara penuh.
    - File: `src/types.ts`, `src/context.ts`
    - Saat ini `ChatFullInfo` sudah ada, tetapi `Chat` masih permissive dan memuat banyak field full info demi backward compatibility.
    - Rekomendasi: lakukan sebagai deprecation path di 1.x, lalu breaking cleanup di 2.0.

- [x] Hapus field forward deprecated dari `Message`.
    - File: `src/types.ts`
    - Field legacy `forward_from`, `forward_from_chat`, `forward_from_message_id`, `forward_signature`, `forward_sender_name`, dan `forward_date` dihapus dari tipe `Message`.
    - `isForwarded` sekarang hanya memakai `forward_origin`.

- [x] Hapus `ExtraPoll.correct_option_id`.
    - File: `src/types.ts`
    - Alias singular dihapus dari `ExtraPoll`; gunakan `correct_option_ids` sesuai Bot API 9.6.
    - `ctx.replyWithPoll()` tidak lagi mengonversi `correct_option_id` menjadi array.

- [x] Tambahkan `copy_text` ke `InlineKeyboardButton`.
    - File: `src/types.ts`
    - `Markup.button.copy()` sudah mengeluarkan `copy_text`; interface sekarang punya `copy_text?: CopyTextButton`.
    - Type regression test ditambahkan.

- [ ] Kurangi lint warnings `any` dan non-null assertion.
    - Kondisi saat audit: lint pass dengan 144 warnings.
    - Target bertahap: turun ke <75 dulu, lalu <25.

### Performance and Internals

- [ ] Optimasi `Composer.cloneTriggerRegex()`.
    - File: `src/composer.ts`
    - Saat ini selalu clone regex. Rekomendasi: clone hanya jika regex punya flag `g` atau `y`.

- [ ] Lazy import `fs` dan `crypto`.
    - File: `src/client.ts`, `src/webapp.ts`
    - Saat ini masih top-level import.
    - Rekomendasi: ukur cold-start dulu sebelum mengubah.

- [ ] Broadcast queue concurrency refinement.
    - File: `src/queue.ts`
    - Implementasikan pool/semaphore jika ada bukti spike pada batch besar.

### DX and Public API

- [ ] Typed middleware guard.
    - File: `src/composer.ts`
    - Tambahkan `guard()` atau overload typed middleware untuk narrow context.

- [x] Subpath exports.
    - File: `package.json`
    - `./markup`, `./filters`, `./errors`, `./types`, dan semua modul publik lain ditambahkan.
    - Export map diverifikasi dengan test konfigurasi, build, pack dry-run, dan smoke import CJS/ESM setelah build.

- [x] JSDoc examples untuk public API utama.
    - File: `src/context.ts`, `src/bot.ts`
    - Examples ditambahkan untuk `Bot`, `reply`, `replyWithPhoto`, `editMessageText`, `answerCbQuery`, `banChatMember`, `replyWithPoll`, `sendChatAction`, `setReaction`, dan `guard()`.

- [x] Perkuat tests untuk `bot.on('text' | media)`.
    - File: `src/composer.ts`, `tests/composer.test.ts`
    - Test tambahan ditambahkan di `tests/bot.test.ts` untuk media shortcut, array routing, cache invalidation, dan `start/help/settings`.

### Feature Backlog

- [x] Middleware timeout.
    - File: `src/bot.ts`
    - `updateTimeout` option ditambahkan dan timeout dipancarkan via `onUpdateError` + `catch()`.

- [ ] Graceful webhook launch mode.
    - File: `src/bot.ts`
    - Tambahkan `bot.launch({ webhook: { url, port, secretToken, path } })`.
    - Perlu test native HTTP server dan shutdown behavior.

- [x] `ctx.telegram` proxy.
    - File: `src/context.ts`
    - `ctx.telegram` sekarang alias scoped `TelegramClient`, sehingga direct API tetap discoverable tanpa menduplikasi semua wrapper `Bot`.

- [ ] Network error retry.
    - File: `src/client.ts`
    - Tambahkan `networkRetries` dan exponential backoff.
    - Jangan retry 4xx client errors.

- [ ] Webhook health check endpoint.
    - File: `src/adapters.ts`
    - Tambahkan `healthPath` untuk adapters.

- [ ] `Conversation.waitForAny()`.
    - File: `src/conversation.ts`
    - Return discriminated union untuk text/callback/media.

### Bot API Coverage Backlog

- [x] Business account wrappers.
    - Methods: `readBusinessMessage`, `deleteBusinessMessages`, `setBusinessAccountName`, `setBusinessAccountUsername`, `setBusinessAccountBio`, `setBusinessAccountProfilePhoto`, `removeBusinessAccountProfilePhoto`, `setBusinessAccountGiftSettings`, `getBusinessConnection`.
    - File: `src/bot.ts`.
    - Tests: `tests/bot.test.ts`.

- [x] Gift and story wrappers.
    - Methods: `giftPremiumSubscription`, `upgradeGift`, `transferGift`, `getChatGifts`, `postStory`, `editStory`, `deleteStory`, `repostStory`.
    - File: `src/bot.ts`, `src/types.ts`.
    - Tests: `tests/bot.test.ts`, `tests/context.test.ts`.

### Docs and Infra

- [x] Update AGENTS release notes.
    - Tambahkan bahwa `1.1.0` juga burned dan latest npm adalah `1.2.0`.
    - Jangan arahkan agent ke `1.1.0` lagi.

- [x] Add `.github/ISSUE_TEMPLATE`.
    - Files: `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`.

- [ ] Full docs ID sync audit.
    - File: `docs/id/**`
    - EN/ID sekarang punya struktur file yang sejajar, tetapi audit kesetaraan isi belum selesai.

- [x] Normalize `repository.url`.
    - File: `package.json`
    - npm publish memperingatkan auto-correct ke `git+https://github.com/alfandi09/vibegram.git`.

- [ ] GitHub Release/tag item dari PLAN lama ditolak untuk eksekusi otomatis.
    - PLAN lama menyarankan `git tag v1.0.1`.
    - Ini konflik dengan AGENTS.md yang melarang tag manual tanpa instruksi eksplisit.

---

## Rekomendasi Urutan Update Berikutnya

### Phase A - Patch Hygiene, target `1.2.1`

1. [x] Update AGENTS release notes: tandai `1.1.0` burned dan `1.2.0` published.
2. [x] Normalize `repository.url` agar publish berikutnya tanpa npm warning.
3. [x] Tambahkan `InlineKeyboardButton.copy_text`.
4. [x] Tambahkan issue templates.
5. [x] Jalankan full validation lokal dan siapkan patch release `1.2.1`.

### Phase B - Security/Stability, target `1.3.0` jika ada opsi baru

1. [x] Rate limit fallback + optional strict mode.
2. [x] `callApi()` payload validation + configurable max payload size.
3. [x] `ConversationManager.cancelAll()`.
4. [x] Periodic cleanup `MemorySessionStore`.
5. [x] Tests untuk happy path, edge cases, dan failure path.

### Phase C - Developer Experience, target `1.3.0` atau `1.4.0`

1. [x] Subpath exports.
2. [x] Typed `guard()` middleware.
3. [x] Middleware timeout.
4. [x] Extra tests untuk `bot.on()` shortcuts.
5. [x] JSDoc examples untuk API utama.

### Phase D - API Coverage, target minor release

1. [x] Business account wrappers.
2. [x] Gift and story wrappers.
3. [x] `ctx.telegram` design jika benar-benar mengurangi boilerplate.
4. [x] Docs update untuk wrappers baru.

### Phase E - Breaking Cleanup, target `2.0.0`

1. [x] Remove deprecated forward fields.
2. [x] Remove `correct_option_id`.
3. Split `Chat` and `ChatFullInfo` strictly.
4. Replace Axios/FormData with native fetch/FormData only jika benchmark dan compatibility sudah jelas.

---

## Validation Checklist Untuk Setiap Release

```bash
npm view vibegram versions --json
npm run lint
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run build
npm run docs:build
npm pack --dry-run
```

Jangan tag manual, jangan `npm publish` manual, dan jangan stage `dist/`, `node_modules/`, `.env`, `.claude/`, atau file analisis sementara.
