# Pengenalan

VibeGram adalah framework Bot Telegram berbasis TypeScript yang dirancang untuk lingkungan produksi. Framework ini hadir dengan **20 modul bawaan** yang mencakup segalanya mulai dari routing dan manajemen state hingga keamanan dan broadcasting massal.

## Mengapa VibeGram?

| Fitur | VibeGram | Bot API Mentah |
|-------|----------|----------------|
| Pipeline middleware | ✅ Built-in | ❌ Manual |
| Type safety | ✅ 32+ interface | ❌ `any` |
| Manajemen session | ✅ Generik bertipe | ❌ Manual |
| Conversation | ✅ async/await | ❌ Manual |
| Rate limiting | ✅ Built-in | ❌ Manual |
| Paginasi | ✅ Otomatis | ❌ Manual |
| Menu builder | ✅ Stateful | ❌ Manual |
| Broadcasting | ✅ Rate-limited | ❌ Manual |
| Sistem plugin | ✅ Composable | ❌ N/A |
| Caching API | ✅ Built-in | ❌ Manual |
| Keamanan WebApp | ✅ HMAC-SHA256 | ❌ Manual |
| Filter combinator | ✅ and/or/not | ❌ Manual |
| Adapter framework | ✅ 5 adapter | ❌ Manual |
| Grid keyboard | ✅ Markup.grid() | ❌ Manual |
| ctx.match | ✅ Otomatis | ❌ Manual |

## Gambaran Arsitektur

```
Instansi Bot
  ├── TelegramClient (HTTP + Keep-Alive)
  ├── Sistem Plugin (BotPlugin + Preset)
  ├── Composer (Stack Middleware)
  │   ├── Logger
  │   ├── RateLimit
  │   ├── API Cache
  │   ├── Session (generik bertipe)
  │   ├── Filter Combinator (and/or/not)
  │   ├── Stage (Scene)
  │   ├── Wizard (form linear)
  │   ├── Conversation (berbasis async/await)
  │   ├── Menu (menu inline stateful)
  │   └── Handler Anda
  ├── Context (objek per-update)
  │   ├── 60+ metode pesan/media/admin
  │   └── Builder inline query
  └── BotQueue (broadcasting + scheduling)
```

## Modul Bawaan (20)

| Modul | Deskripsi |
|-------|-----------|
| `Bot` | Titik masuk dengan polling, webhook, dan dukungan plugin |
| `TelegramClient` | HTTP client dengan Keep-Alive |
| `Context` | 60+ metode untuk semua operasi Bot API |
| `Composer` | Stack middleware: compose/use/command/on/hears/action |
| `Markup` | Builder keyboard (inline, reply, force-reply, grid) |
| `Session` | Session store bertipe dengan eviksi LRU |
| `Scene` | Isolasi percakapan multi-ruang |
| `Wizard` | Form multi-langkah linear |
| `Conversation` | Dialog async/await dengan branching dan validasi |
| `Menu` | Menu inline stateful dengan sub-navigasi |
| `Filters` | 20+ predikat composable dengan and/or/not |
| `InlineResults` | Builder untuk hasil inline query (9 tipe) |
| `Plugin` | Interface BotPlugin, factory createPlugin, Preset |
| `BotQueue` | Broadcasting dan scheduling rate-limited |
| `apiCache` | Caching respons API berbasis TTL |
| `rateLimit` | Middleware anti-spam |
| `WebAppUtils` | Validasi Mini App HMAC-SHA256 |
| `I18n` | Internasionalisasi dengan deteksi lokal otomatis |
| `logger` | Timing request dan klasifikasi update |
| `Types` | 32+ interface TypeScript untuk Bot API v9.6 |

## Adapters Framework

VibeGram menyediakan adapter kelas satu untuk framework Node.js populer:

| Adapter | Framework | Import |
|---------|-----------|--------|
| `createExpressMiddleware()` | Express.js 4+ | `from 'vibegram'` |
| `createFastifyPlugin()` | Fastify v4+ | `from 'vibegram'` |
| `createHonoHandler()` | Hono v3+ | `from 'vibegram'` |
| `createKoaMiddleware()` | Koa v2+ | `from 'vibegram'` |
| `createNativeHandler()` | Node.js HTTP | `from 'vibegram'` |

## Cakupan Bot API

VibeGram menargetkan **Telegram Bot API v9.6** (April 2026) dengan:
- **60+ metode Context** untuk pesan, media, dan konten interaktif
- **32 interface TypeScript** mencakup semua objek API utama
- Dukungan Telegram Stars, Pesan Draft, Managed Bot, Forum Topic, dan lainnya
