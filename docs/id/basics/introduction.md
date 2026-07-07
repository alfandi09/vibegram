# Pengenalan

VibeGram adalah framework Bot Telegram berbasis TypeScript yang ringan dan
dirancang untuk lingkungan produksi. VibeGram membawa 20 modul bawaan untuk
routing, state, keamanan, webhook, plugin, dan broadcasting.

## Mengapa VibeGram?

Tabel ini membandingkan bagaimana fitur umum bot dikemas, bukan klaim bahwa
framework lain tidak bisa mengimplementasikannya. Tabel dicek terhadap
`grammy@1.44.0`, `telegraf@4.16.3`, dan dokumentasi resmi mereka pada
2026-07-07; package komunitas di luar docs resmi tidak didata secara
menyeluruh.

| Area | VibeGram | grammY | Telegraf | API Bot Mentah |
| --- | --- | --- | --- | --- |
| Pipeline middleware | Core | Core | Core | Manual |
| Tipe TypeScript | Core | Core | Core | Manual |
| State session | Core `session()` | Plugin session built-in | Core `session()` | Manual |
| Alur conversation | Core `Conversation`, `Scene`, `Wizard` | Official `@grammyjs/conversations` | Core `Scenes` / `WizardScene` | Manual |
| Rate limiting masuk | Core `rateLimit()` | Official `@grammyjs/ratelimiter` | Middleware eksternal atau custom | Manual |
| Flood control keluar | Core `BotQueue`; official `@vibegram/throttler` | Official `@grammyjs/transformer-throttler` + `runner` | Middleware eksternal atau custom | Manual |
| Menu interaktif | Core `Menu` | Official `@grammyjs/menu` | Primitive keyboard atau library menu eksternal | Manual |
| Helper layout keyboard | Core `Markup.grid()` | `InlineKeyboard` / `Keyboard` dengan `row()` / `from()` | `Markup.inlineKeyboard(..., { columns, wrap })` | Manual |
| Cache response API | Core `apiCache()` | Transformer atau middleware custom | Middleware custom | Manual |
| Validasi init-data WebApp | Helper HMAC core | Validasi custom/manual | Validasi custom/manual | Manual |
| Integrasi framework webhook | Adapter Express, Fastify, Hono, Koa, Native HTTP | `webhookCallback()` untuk web framework | Helper launch/create webhook plus contoh | Manual |
| Model error | Hierarki class error VibeGram | Class error framework | Class error framework | Manual |

Referensi yang dipakai untuk perbandingan ini: [plugin grammY](https://grammy.dev/plugins/),
[session grammY](https://grammy.dev/plugins/session),
[menu grammY](https://grammy.dev/plugins/menu),
[conversation grammY](https://grammy.dev/plugins/conversations),
[rate limiter grammY](https://grammy.dev/plugins/ratelimiter),
[flood control grammY](https://grammy.dev/plugins/transformer-throttler),
[webhook callback grammY](https://grammy.dev/ref/core/webhookcallback),
[docs Telegraf](https://telegraf.js.org/),
[session Telegraf](https://telegraf.js.org/functions/session.html),
[Telegraf WizardScene](https://telegraf.js.org/classes/Scenes.WizardScene.html),
dan [Telegraf inline keyboard](https://telegraf.js.org/functions/Markup.inlineKeyboard.html).

## Gambaran Arsitektur

```text
Instansi Bot
  TelegramClient (transport HTTP)
  Sistem Plugin (BotPlugin + Preset)
  Composer (stack middleware)
    logger()
    dedupeUpdates()
    rateLimit()
    apiCache()
    session()
    filters, scenes, wizards, conversations, menus
    handler Anda
  Context (helper per-update)
  BotQueue (broadcasting + scheduling)
  Adapter framework (Express, Fastify, Hono, Koa, Native HTTP)
```

## Modul Bawaan (20)

| Modul | Deskripsi |
| --- | --- |
| `Bot` | Entry point dengan polling, webhook, dan plugin |
| `TelegramClient` | Client Telegram Bot API dengan transport HTTP internal |
| `Context` | Helper per-update untuk pesan, media, admin, dan utility |
| `Composer` | Stack middleware dengan `use`, `command`, `on`, `hears`, dan `action` |
| `Markup` | Helper keyboard, grid, dan escaping aman |
| `session` | Session store bertipe dengan pola adapter |
| `Scene` | Ruang state percakapan bernama |
| `Wizard` | Form multi-step linear |
| `Conversation` | Helper dialog async dengan validasi dan timeout |
| `Menu` | Menu inline stateful dengan sub-navigasi |
| `Filters` | Predikat update yang bisa dikomposisi |
| `InlineResults` | Builder hasil inline query |
| `Plugin` | `BotPlugin`, `createPlugin`, dan `Preset` |
| `BotQueue` | Broadcasting dan scheduling rate-limited |
| `apiCache` | Cache response Telegram API berbasis TTL |
| `rateLimit` | Middleware anti-spam inbound |
| `dedupeUpdates` | Dropper update duplikat dengan memory atau custom store |
| `WebAppUtils` | Validasi HMAC Telegram Mini App |
| `I18n` | Deteksi locale dan middleware terjemahan |
| `Adapters` | Adapter webhook Express, Fastify, Hono, Koa, dan Native HTTP |

## Cakupan Bot API

VibeGram menargetkan Telegram Bot API 10.1 dengan:

- Helper Context untuk pesan, media, admin, forum, business flow, checklist,
  sticker, hadiah, dan verifikasi.
- Cakupan TypeScript kuat untuk object utama Telegram.
- Adapter webhook dengan validasi secret token dan body limit.
- Dukungan Telegram Stars, Draft Messages, Managed Bots, Rich Messages,
  Join Request Queries, dan media link pada poll.

## Yang Baru di 2.5.0

- Perlindungan update duplikat lewat `dedupeUpdates()`,
  `MemoryUpdateDedupeStore`, dan subpath `vibegram/dedupe`.
- Kontrol commit offset polling dengan `polling.offsetCommit: 'processed'`
  untuk retry update yang gagal sebelum offset dinaikkan.
- Batas ukuran response lewat `TelegramClientOptions.maxResponseBytes`.
- Routing command lebih aman untuk mention bot dan tabrakan prefix command.
- Timeout HTTP kini mencakup parsing body dan cleanup stream.
- Opsi queue dan rate-limit kini gagal cepat saat nilai numeriknya tidak valid.
- Interpolasi Markdown plugin Codex di-escape untuk nilai dari user.
- Plugin security kini menyediakan helper production preset.

Lihat [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
untuk detail release lengkap.
