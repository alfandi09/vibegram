# Introduction

VibeGram is a lightweight, TypeScript-first Telegram Bot framework designed for
production environments. It ships 20 built-in modules covering routing, state,
security, webhooks, plugins, and broadcasting.

## Why VibeGram?

| Feature | VibeGram | grammY | Telegraf | Raw API |
| --- | :---: | :---: | :---: | :---: |
| Middleware pipeline | yes | yes | yes | manual |
| TypeScript native | yes | yes | yes | manual |
| Session management | yes | plugin | plugin | manual |
| Conversations | yes | plugin | plugin | manual |
| Rate limiting | yes | plugin | manual | manual |
| Built-in pagination | yes | manual | manual | manual |
| `Markup.grid()` | yes | manual | manual | manual |
| `ctx.match` auto-inject | yes | yes | yes | manual |
| Menu builder | yes | plugin | manual | manual |
| Broadcasting queue | yes | manual | manual | manual |
| API response cache | yes | manual | manual | manual |
| WebApp security | HMAC-SHA256 | manual | manual | manual |
| Filter combinators | and/or/not | manual | manual | manual |
| Framework adapters | 5 adapters | manual | manual | manual |
| Error class hierarchy | `instanceof` | manual | manual | manual |

## Architecture Overview

```text
Bot Instance
  TelegramClient (HTTP transport)
  Plugin System (BotPlugin + Preset)
  Composer (middleware stack)
    logger()
    dedupeUpdates()
    rateLimit()
    apiCache()
    session()
    filters, scenes, wizards, conversations, menus
    your handlers
  Context (per-update helpers)
  BotQueue (broadcasting + scheduling)
  Framework adapters (Express, Fastify, Hono, Koa, Native HTTP)
```

## Built-in Modules (20)

| Module | Description |
| --- | --- |
| `Bot` | Entry point with polling, webhooks, and plugin support |
| `TelegramClient` | Telegram Bot API client with internal HTTP transport |
| `Context` | Per-update helper object with message, media, admin, and utility methods |
| `Composer` | Middleware stack with `use`, `command`, `on`, `hears`, and `action` |
| `Markup` | Keyboard, grid, and safe escaping helpers |
| `session` | Typed session store with adapter pattern |
| `Scene` | Named conversation state rooms |
| `Wizard` | Linear multi-step forms |
| `Conversation` | Async dialogue helpers with validation and timeouts |
| `Menu` | Stateful inline menus with sub-navigation |
| `Filters` | Composable update predicates |
| `InlineResults` | Builder for inline query results |
| `Plugin` | `BotPlugin`, `createPlugin`, and `Preset` |
| `BotQueue` | Rate-limited broadcasting and scheduling |
| `apiCache` | TTL-based Telegram API response cache |
| `rateLimit` | Inbound anti-spam middleware |
| `dedupeUpdates` | Duplicate update dropper with memory or custom store |
| `WebAppUtils` | Telegram Mini App HMAC validation |
| `I18n` | Locale detection and translation middleware |
| `Adapters` | Express, Fastify, Hono, Koa, and Native HTTP webhook adapters |

## Bot API Coverage

VibeGram targets Telegram Bot API 10.1 with:

- Context helpers for messages, media, admin, forums, business flows, checklists,
  stickers, gifts, and verification.
- Strong TypeScript coverage for major Telegram objects.
- Webhook adapters with secret-token validation and body limits.
- Support for Telegram Stars, Draft Messages, Managed Bots, Rich Messages,
  Join Request Queries, and poll link media.

## What's New in 2.4.0

- Bot API 10.1 Rich Messages: `sendRichMessage()`, `sendRichMessageDraft()`,
  and `ctx.replyWithRichMessage()`.
- Bot API 10.1 Join Request Queries: `answerChatJoinRequestQuery()` and
  `sendChatJoinRequestWebApp()`.
- Safe interpolation helpers: `Markup.escapeHTML()`, `escapeMarkdownV2()`,
  and `escapeMarkdown()`.
- Atomic `RateLimitStore.increment()` support for shared stores.
- Per-key session serialization and LRU memory stores.
- Multipart header-injection hardening.

See the full [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
for release details.
