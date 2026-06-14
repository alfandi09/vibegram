# Changelog

Release notes for VibeGram. This page highlights the changes most useful for developers using the framework.

For the complete release log, see the repository [CHANGELOG.md](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md).

## 2.4.0

### Added

- **Bot API 10.1 — Rich Messages**: `bot.sendRichMessage()`, `bot.sendRichMessageDraft()`, and the `ctx.replyWithRichMessage()` shortcut, plus the full type family (`RichMessage`, `InputRichMessage`, `RichText`, `RichBlock`, and all 25 `RichText*` / 21 `RichBlock*` element types).
- **Bot API 10.1 — Join Request Queries**: `bot.answerChatJoinRequestQuery()` and `bot.sendChatJoinRequestWebApp()`, with new fields `User.supports_join_request_queries`, `ChatFullInfo.guard_bot`, and `ChatJoinRequest.query_id`.
- **Bot API 10.1 — Polls**: `Link` and `InputMediaLink` types (link media for poll options).
- `Markup.escapeHTML()`, `Markup.escapeMarkdownV2()`, and `Markup.escapeMarkdown()` helpers for safely interpolating untrusted text into formatted messages.
- Optional atomic `increment()` method on `RateLimitStore` for race-free rate limiting on shared async stores (e.g. Redis).

### Fixed

- **Session concurrency**: the `session()` middleware now serializes load/save per key, preventing lost updates when the same user sends messages concurrently.
- **Queue timers**: `scheduleOnce()` no longer orphans a timer when its handler re-schedules the same id, and `scheduleInterval()` skips overlapping runs.
- **Multipart**: control characters are stripped from multipart field names to prevent header injection.
- **LRU eviction**: `MemoryCache` and `MemorySessionStore` now refresh recency on read, so eviction is genuinely least-recently-used rather than insertion-order.

## 2.3.0

Released on 2026-06-05.

### Added

- Added Bot API 10.0 type coverage for guest messages, live photos, poll media, chat reaction permissions, and managed bot access settings.
- Added Bot API 10.0 wrappers for guest replies, live photos, reaction cleanup, managed bot access settings, and personal chat message lookup.

### Security

- Removed runtime `axios`, `form-data`, and `follow-redirects` dependency exposure by using VibeGram's internal native HTTP transport and multipart serializer.

## 2.2.1

Released on 2026-05-22.

### Highlights

- Bundled the Codex Telegram plugin into the main `vibegram` package.
- Added the public `vibegram/codex` subpath for `codex()`, `codexProvider()`, manual auth JSON helpers, memory store types, and provider helpers.
- Kept publishing on the normal `vibegram` release flow instead of publishing a separate `@vibegram/codex` package.

### Usage

```typescript
import { codex, codexProvider } from 'vibegram/codex';
```

## 2.1.0

Released on 2026-04-29.

### Highlights

- Added the experimental `@vibegram/codex` package for connecting VibeGram bots to ChatGPT/Codex sessions.
- Added `ctx.codex` helpers for prompts, provider status, model listing, conversation reset, usage tracking, and per-user personality instructions.
- Added built-in `/codex` commands for help, status, models, explicit prompts, resets, and personality management.
- Added English and Indonesian Codex docs with server-first secret setup, `auth.json` handling, local smoke-test steps, provider options, troubleshooting, and security guidance.
- Updated `axios` to `1.15.2`.

### Experimental Codex Plugin

The Codex plugin is designed for personal bots, private experiments, and internal tools. It uses a Codex/ChatGPT session token and targets the ChatGPT Codex backend, not the official OpenAI API.

Start here:

- [Codex for Telegram](/plugins/codex)

### Validation

- Codex package typecheck passed.
- Codex package tests passed.
- Codex package build passed.
- VitePress docs build passed.

## 2.0.0

Released on 2026-04-27.

### Highlights

- Introduced breaking type cleanup for forwarded messages, poll extras, and rich chat metadata.
- Added opt-in Telegram client network retries.
- Added webhook adapter health checks.
- Added native graceful webhook launch mode.
- Added `ConversationContext.waitForAny()`.
- Added `ctx.telegram` as a discoverable alias for the scoped Telegram client.
- Added typed `guard()` middleware overloads.
- Added public subpath exports for framework modules.
- Added broader business, gifts, stories, and monetization method coverage.
- Rebuilt the VitePress documentation experience with responsive navigation, local search, reusable docs components, and EN/ID content sync.

### Migration

Review the full changelog before upgrading from `1.x`, especially if your bot depends on forwarded-message legacy fields, poll extras, or `getChat()` return shapes.

## 1.2.1

Released on 2026-04-25.

### Highlights

- Added missing `copy_text` coverage for `InlineKeyboardButton`.
- Added GitHub issue templates.
- Updated repository and release metadata.

## Full History

The full changelog includes every historical release note, validation detail, and compatibility note:

- [View full CHANGELOG.md](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md)
- [View package on npm](https://www.npmjs.com/package/vibegram)
