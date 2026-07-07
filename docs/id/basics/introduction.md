# Pengenalan

VibeGram adalah framework Bot Telegram berbasis TypeScript yang ringan dan
dirancang untuk lingkungan produksi. VibeGram membawa 20 modul bawaan untuk
routing, state, keamanan, webhook, plugin, dan broadcasting.

## Mengapa VibeGram?

| Fitur | VibeGram | grammY | Telegraf | API Mentah |
| --- | :---: | :---: | :---: | :---: |
| Pipeline middleware | ya | ya | ya | manual |
| TypeScript native | ya | ya | ya | manual |
| Manajemen session | ya | plugin | plugin | manual |
| Conversation | ya | plugin | plugin | manual |
| Rate limiting | ya | plugin | manual | manual |
| Paginasi bawaan | ya | manual | manual | manual |
| `Markup.grid()` | ya | manual | manual | manual |
| Auto-inject `ctx.match` | ya | ya | ya | manual |
| Menu builder | ya | plugin | manual | manual |
| Queue broadcasting | ya | manual | manual | manual |
| Cache response API | ya | manual | manual | manual |
| Keamanan WebApp | HMAC-SHA256 | manual | manual | manual |
| Filter combinator | and/or/not | manual | manual | manual |
| Adapter framework | 5 adapter | manual | manual | manual |
| Hierarki class error | `instanceof` | manual | manual | manual |

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

## Yang Baru di 2.4.0

- Bot API 10.1 Rich Messages: `sendRichMessage()`, `sendRichMessageDraft()`,
  dan `ctx.replyWithRichMessage()`.
- Bot API 10.1 Join Request Queries: `answerChatJoinRequestQuery()` dan
  `sendChatJoinRequestWebApp()`.
- Helper interpolasi aman: `Markup.escapeHTML()`, `escapeMarkdownV2()`,
  dan `escapeMarkdown()`.
- Dukungan `RateLimitStore.increment()` atomik untuk shared store.
- Serialisasi session per-key dan memory store LRU.
- Hardening multipart dari header injection.

Lihat [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
untuk detail release lengkap.
