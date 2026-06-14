# Introduction

VibeGram is a lightweight, TypeScript-first Telegram Bot framework designed for production environments. It ships **20 built-in modules** covering everything from routing and state management to security and mass broadcasting.

## Why VibeGram?

| Feature               |    VibeGram    | grammY | Telegraf | Raw API |
| --------------------- | :------------: | :----: | :------: | :-----: |
| Middleware pipeline   |       ✅       |   ✅   |    ✅    |   ❌    |
| TypeScript native     |       ✅       |   ✅   |    ✅    |   ❌    |
| Session management    |       ✅       |   ✅   |    ✅    |   ❌    |
| Conversations         |       ✅       |   ✅   |    ✅    |   ❌    |
| Rate limiting         |       ✅       |   ❌   |    ❌    |   ❌    |
| Built-in Pagination   |       ✅       |   ❌   |    ❌    |   ❌    |
| `Markup.grid()`       |       ✅       |   ❌   |    ❌    |   ❌    |
| ctx.match auto-inject |       ✅       |   ✅   |    ✅    |   ❌    |
| Menu builder          |       ✅       |   ✅   |    ❌    |   ❌    |
| Broadcasting queue    |       ✅       |   ❌   |    ❌    |   ❌    |
| API response cache    |       ✅       |   ❌   |    ❌    |   ❌    |
| WebApp security       | ✅ HMAC-SHA256 |   ❌   |    ❌    |   ❌    |
| Filter combinators    | ✅ and/or/not  |   ❌   |    ❌    |   ❌    |
| Framework adapters    | ✅ 5 adapters  |   ❌   |    ❌    |   ❌    |
| Error class hierarchy | ✅ instanceof  |   ❌   |    ❌    |   ❌    |

## Architecture Overview

```
Bot Instance
  ├── TelegramClient (HTTP + Keep-Alive)
  ├── Plugin System (BotPlugin + Preset)
  ├── Composer (Middleware Stack)
  │   ├── Logger
  │   ├── RateLimit
  │   ├── API Cache
  │   ├── Session (typed generics)
  │   ├── Filter Combinators (and/or/not)
  │   ├── Stage (Scenes)
  │   ├── Wizard (linear forms)
  │   ├── Conversation (async await-based)
  │   ├── Menu (stateful inline menus)
  │   └── Your Handlers
  ├── Context (per-update object)
  │   ├── 60+ message/media/admin methods
  │   ├── Forum Topic, Star Gifts, Verification
  │   └── Inline query builder
  ├── BotQueue (broadcasting + scheduling)
  └── Framework Adapters (Express/Fastify/Hono/Koa/Native)
```

## Built-in Modules (20)

| Module           | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `Bot`            | Entry point with polling, webhooks, and plugin support      |
| `TelegramClient` | HTTP client with Keep-Alive                                 |
| `Context`        | 60+ methods for all Bot API 10.1 operations                |
| `Composer`       | Middleware stack with compose/use/command/on/hears/action   |
| `Markup`         | Keyboard builder (inline, reply, grid, force-reply, remove) |
| `Session`        | Typed session store with LRU eviction + adapter pattern     |
| `Scene`          | Multi-room conversation isolation                           |
| `Wizard`         | Linear multi-step forms                                     |
| `Conversation`   | Async/await dialogues with branching and validation         |
| `Menu`           | Stateful inline menus with sub-navigation                   |
| `Filters`        | 20+ composable predicates with and/or/not                   |
| `InlineResults`  | Builder for inline query results (9 types)                  |
| `Plugin`         | BotPlugin interface, createPlugin factory, Preset           |
| `BotQueue`       | Rate-limited broadcasting and job scheduling                |
| `apiCache`       | TTL-based API response caching                              |
| `rateLimit`      | Anti-spam middleware, auto-tuned per chat type              |
| `WebAppUtils`    | HMAC-SHA256 Mini App validation                             |
| `I18n`           | Internationalization with locale auto-detection             |
| `logger`         | Request timing and update classification                    |
| `Adapters`       | Express, Fastify, Hono, Koa, Native HTTP webhook adapters   |

## Bot API Coverage

VibeGram targets **Telegram Bot API 10.1** (June 2026) with:

- **60+ Context methods** spanning messages, media, admin, forums, business flows, checklists, stickers, and verification
- Strong TypeScript coverage for major API objects, with ongoing sync work for the newest Telegram feature families
- **5 Framework adapters** for webhook deployment
- Support for Forum Topics, Telegram Stars, Managed Bots, Draft Messages, and more
- Guest Mode, live photos, poll media, reaction cleanup methods, and managed bot access settings
- Rich Messages, Join Request Queries, and poll link media (Bot API 10.1)

## What's New in 2.4.0

- ✅ Bot API 10.1 Rich Messages — `sendRichMessage()`, `sendRichMessageDraft()`, `ctx.replyWithRichMessage()`
- ✅ Bot API 10.1 Join Request Queries — `answerChatJoinRequestQuery()`, `sendChatJoinRequestWebApp()`
- ✅ `Markup.escapeHTML()` / `escapeMarkdownV2()` / `escapeMarkdown()` for safe text interpolation
- ✅ Atomic `increment()` hook on `RateLimitStore` for race-free shared-store rate limiting
- ✅ Per-key session serialization — no lost writes under concurrent updates
- ✅ True LRU eviction for `MemoryCache` and `MemorySessionStore`
- ✅ Hardened multipart serialization against header injection
- ✅ 415+ unit tests covering core runtime, adapters, security utilities, and example smoke tests

See the full [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md) for details.
