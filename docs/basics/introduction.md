# Introduction

VibeGram is a lightweight, TypeScript-first Telegram Bot framework designed for
production environments. It ships 20 built-in modules covering routing, state,
security, webhooks, plugins, and broadcasting.

## Why VibeGram?

This table compares how common bot-building features are packaged, not whether
other frameworks can implement them at all. It was checked against
`grammy@1.44.0`, `telegraf@4.16.3`, and their official docs on 2026-07-07;
community packages outside the official docs are not exhaustively listed.

| Area | VibeGram | grammY | Telegraf | Raw Bot API |
| --- | --- | --- | --- | --- |
| Middleware pipeline | Core | Core | Core | Manual |
| TypeScript types | Core | Core | Core | Manual |
| Session state | Core `session()` | Built-in session plugin | Core `session()` | Manual |
| Conversation flows | Core `Conversation`, `Scene`, `Wizard` | Official `@grammyjs/conversations` | Core `Scenes` / `WizardScene` | Manual |
| Incoming rate limiting | Core `rateLimit()` | Official `@grammyjs/ratelimiter` | External middleware or custom | Manual |
| Outgoing flood control | Core `BotQueue`; official `@vibegram/throttler` | Official `@grammyjs/transformer-throttler` + `runner` | External middleware or custom | Manual |
| Interactive menus | Core `Menu` | Official `@grammyjs/menu` | Keyboard primitives or external menu libs | Manual |
| Keyboard layout helpers | Core `Markup.grid()` | `InlineKeyboard` / `Keyboard` with `row()` / `from()` | `Markup.inlineKeyboard(..., { columns, wrap })` | Manual |
| API response cache | Core `apiCache()` | Custom transformer or middleware | Custom middleware | Manual |
| WebApp init-data validation | Core HMAC helper | Custom/manual validation | Custom/manual validation | Manual |
| Webhook framework integration | Express, Fastify, Hono, Koa, Native HTTP adapters | `webhookCallback()` for web frameworks | Webhook launch/create helpers plus examples | Manual |
| Error model | VibeGram error class hierarchy | Framework error classes | Framework error classes | Manual |

References used for this comparison: [grammY plugins](https://grammy.dev/plugins/),
[grammY sessions](https://grammy.dev/plugins/session),
[grammY menus](https://grammy.dev/plugins/menu),
[grammY conversations](https://grammy.dev/plugins/conversations),
[grammY rate limiter](https://grammy.dev/plugins/ratelimiter),
[grammY flood control](https://grammy.dev/plugins/transformer-throttler),
[grammY webhook callback](https://grammy.dev/ref/core/webhookcallback),
[Telegraf docs](https://telegraf.js.org/),
[Telegraf session](https://telegraf.js.org/functions/session.html),
[Telegraf WizardScene](https://telegraf.js.org/classes/Scenes.WizardScene.html),
and [Telegraf inline keyboard](https://telegraf.js.org/functions/Markup.inlineKeyboard.html).

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

## What's New in 2.5.0

- Duplicate update protection with `dedupeUpdates()`,
  `MemoryUpdateDedupeStore`, and the `vibegram/dedupe` subpath.
- Polling offset commit control with `polling.offsetCommit: 'processed'` for
  retrying failed updates before advancing offsets.
- Response size limits with `TelegramClientOptions.maxResponseBytes`.
- Safer command routing for bot mentions and command prefix collisions.
- HTTP timeout coverage now includes body parsing and stream cleanup.
- Queue and rate-limit options now fail fast on invalid numeric values.
- Codex plugin Markdown interpolation is escaped for user-controlled values.
- The security plugin now includes a production preset helper.

See the full [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
for release details.
