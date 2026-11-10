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

VibeGram targets Telegram Bot API 10.3 with:

- Context helpers for messages, media, admin, forums, business flows, checklists,
  stickers, gifts, and verification.
- Strong TypeScript coverage for major Telegram objects.
- Webhook adapters with secret-token validation and body limits.
- Support for Telegram Stars, Draft Messages, Managed Bots, Rich Messages,
  Join Request Queries, poll link media, Ephemeral Messages, Communities,
  and block-based rich messages.

## What's New in 3.0

- **Bot API 10.3:** ephemeral messages, block-based rich messages, communities, and a
  stop button for streamed drafts.
- **Type-narrowing filters:** `bot.on('message:photo', ctx => ctx.message.photo)`
  works without `?.` or `!`. See [Filter Queries](/core/handling#filter-queries).
- **Routing helpers:** `filter`, `branch`, `route`, `errorBoundary`, `chatType`,
  and more. See [Composer Combinators](/core/middleware#combinators).
- **Runs on the edge:** `createFetchHandler()` for Cloudflare Workers, Deno, Bun,
  and Next.js. See [Fetch API & Edge](/adapters/fetch).
- **Durable conversations** that survive restarts, and an offline
  [testing kit](/advanced/testing).
- **AI streaming** with drafts and a stop button, plus a builder for rich messages.
- **`npm create vibegram@latest`** project templates.

Upgrading from 2.x takes a few minutes: see [Upgrading to 3.0](/basics/upgrading).
The full list is in the [CHANGELOG](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md).
