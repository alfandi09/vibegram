# Plugin

Plugin resmi VibeGram berada di `plugins/`. Package ini kecil dan fokus, supaya core framework tetap stabil sambil menambahkan building block production untuk polling, retry, storage, formatting, file, hydration, command, routing, member guard, debugging, deployment, security, observability, Telegram Mini Apps, dan pembayaran Stars.

Riset provider experimental dan integrasi yang belum stabil berada di `experimental/` sampai API-nya siap dipakai publik.

## Katalog Plugin Resmi

| Plugin | Package | Dipakai untuk |
| --- | --- | --- |
| Runner | `@vibegram/runner` | Long polling throughput lebih tinggi dengan concurrency terbatas, urutan per-chat, backpressure, dan graceful shutdown |
| Auto Retry | `@vibegram/auto-retry` | Retry outgoing Telegram API call untuk 429, error network sementara, dan HTTP 5xx |
| Throttler | `@vibegram/throttler` | Mengantre dan mengatur tempo outgoing Telegram API call sebelum terkena flood limit |
| Redis Storage | `@vibegram/storage-redis` | Store Redis untuk session, rate-limit, dan memory Codex |
| Parse Mode | `@vibegram/parse-mode` | Builder HTML dan MarkdownV2 aman plus middleware default parse-mode |
| Files | `@vibegram/files` | Resolusi, download, stream, save, dan storage media message Telegram |
| Hydrate | `@vibegram/hydrate` | Helper non-enumerable pada message, callback query, chat, user, dan hasil API message |
| Commands | `@vibegram/commands` | Registry command, sync `setMyCommands`, scope, lokalisasi, dan output `/help` otomatis |
| Router | `@vibegram/router` | Middleware route-key deklaratif untuk session flow, tipe chat, tipe update, dan custom resolver |
| Chat Members | `@vibegram/chat-members` | Cache `getChatMember`, invalidasi update member, dan guard admin/owner/membership |
| Devtools | `@vibegram/devtools` | Capture update tersanitasi, timing middleware, log API, JSONL debugging, dan fixture replay |
| Deploy | `@vibegram/deploy` | Launch server webhook, preset framework, endpoint health/readiness, validasi env, dan graceful shutdown |
| Security | `@vibegram/security` | Allowlist user/chat, admin guard, spam burst guard, safe errors, webhook secret check, dan helper redaction |
| Observability | `@vibegram/observability` | Metrics durasi update/API, error counter, structured log tersanitasi, dan hook OpenTelemetry/Sentry |
| WebApp Kit | `@vibegram/webapp-kit` | Validasi `initData` Telegram Mini App, parsing launch payload bertipe, helper tombol WebApp, dan panduan integrasi frontend/server |
| Stars | `@vibegram/stars` | Invoice Telegram Stars, validasi pre-checkout, handling successful payment, refund, helper gift/business, dan fixture paid update |

## Pola Install

Saat package plugin sudah dipublish, install bersama `vibegram`:

```bash
npm install vibegram @vibegram/runner
```

Saat pengembangan lokal, gunakan file dependency dari repository ini:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/runner": "file:../vibegram/plugins/runner"
  }
}
```

## Aturan Referensi API Telegram

Plugin yang membungkus behavior Telegram Bot API harus mengikuti dokumentasi resmi Telegram terlebih dahulu:

- Gunakan nama method dan parameter resmi Telegram.
- Pertahankan limit, permission rule, dan failure behavior Telegram di docs.
- Dokumentasikan apakah plugin memanggil Telegram langsung, mendekorasi `ctx.client`, atau hanya menambahkan helper lokal.
- Link method Bot API resmi yang relevan di halaman plugin jika fitur memetakan method Telegram.

Referensi: [Telegram Bot API](https://core.telegram.org/bots/api).

## Aturan Direktori

Gunakan `plugins/` untuk package plugin resmi:

```text
plugins/
  runner/
  auto-retry/
  throttler/
  storage-redis/
  parse-mode/
  files/
  hydrate/
  commands/
  router/
  chat-members/
  devtools/
  deploy/
  security/
  observability/
  webapp-kit/
  stars/
```

Gunakan `experimental/` untuk fitur yang masih cepat berubah:

```text
experimental/
  codex/
```

Pemisahan ini menjaga kontrak plugin stabil tetap terpisah dari kode riset.

## Nama Package

Plugin resmi memakai scope `@vibegram/*`:

| Plugin | Package |
| --- | --- |
| Runner | `@vibegram/runner` |
| Auto retry | `@vibegram/auto-retry` |
| Throttler | `@vibegram/throttler` |
| Redis storage | `@vibegram/storage-redis` |
| Parse mode | `@vibegram/parse-mode` |
| Files | `@vibegram/files` |
| Hydrate | `@vibegram/hydrate` |
| Commands | `@vibegram/commands` |
| Router | `@vibegram/router` |
| Chat Members | `@vibegram/chat-members` |
| Devtools | `@vibegram/devtools` |
| Deploy | `@vibegram/deploy` |
| Security | `@vibegram/security` |
| Observability | `@vibegram/observability` |
| WebApp Kit | `@vibegram/webapp-kit` |
| Stars | `@vibegram/stars` |

Gunakan `vibegram` sebagai peer dependency agar user plugin tetap mengontrol versi framework.

```json
{
  "peerDependencies": {
    "vibegram": ">=2.1.0"
  }
}
```

## Template Package

Mulai plugin baru dari:

```text
plugins/_template/
```

Template berisi:

- konfigurasi TypeScript dual CJS dan ESM
- output type declaration
- package exports
- package marker untuk `dist/cjs` dan `dist/esm`
- contoh middleware minimal
- test minimal

Ganti placeholder ini sebelum implementasi:

- `__PLUGIN_NAME__`
- `__PLUGIN_EXPORT__`

## Bentuk Package Wajib

Setiap plugin resmi sebaiknya punya:

```text
plugins/<name>/
  src/index.ts
  tests/*.test.ts
  scripts/postbuild.js
  README.md
  package.json
  tsconfig.json
  tsconfig.esm.json
```

Semua export publik harus didokumentasikan di README plugin dan docs site saat plugin sudah publik.

## Aturan Export

Gunakan satu entry point publik utama:

```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

Tambahkan subpath export hanya jika plugin punya boundary module publik yang jelas.

## Aturan Dependency Runtime

Utamakan tanpa runtime dependency. Tambahkan dependency hanya jika jelas mengurangi risiko maintenance atau menyelesaikan domain problem yang sulit.

Alasan yang kuat:

- integrasi Redis client untuk storage adapter
- adapter OpenTelemetry/Sentry di package observability opsional
- library queue/throttle yang terbukti jika implementasi internal akan rapuh

Alasan yang lemah:

- helper kecil yang bisa ditulis jelas dalam beberapa baris
- abstraksi kosmetik
- dependency yang menduplikasi behavior core VibeGram

## Validasi

Script validasi plugin tersedia di root:

```bash
npm run plugins:typecheck
npm run plugins:test
npm run plugins:build
npm run plugins:validate
```

`plugins:validate` menjalankan typecheck, test, dan build untuk setiap package plugin resmi di `plugins/`.

Direktori template dilewati.

Setiap plugin juga harus pass dari dalam package-nya:

```bash
npm run typecheck
npm test
npm run build
```

## Syarat Dokumentasi

Setiap plugin publik membutuhkan:

- instruksi instalasi
- contoh minimal
- contoh production
- tabel opsi
- catatan API TypeScript
- failure modes
- catatan keamanan jika relevan
- catatan validasi
- halaman docs bahasa Inggris
- halaman docs bahasa Indonesia

## Catatan Release

Jangan bump versi saat implementasi plugin. Tentukan versi hanya setelah semua phase plugin untuk release selesai.

Sebelum release apa pun:

```bash
npm view vibegram versions --json
```

Jangan publish manual. Workflow release repo akan publish dari `main` setelah versi lokal berbeda dari npm.
