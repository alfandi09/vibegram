# Changelog

All notable changes to VibeGram are documented in this file.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [2.2.1] - 2026-05-22

### Changed

- Promoted the Codex Telegram plugin into the main `vibegram` package as the public `vibegram/codex` subpath so bots can use it without installing or publishing a separate `@vibegram/codex` package.
- Moved Codex source, examples, and tests into the root build and test pipeline.
- Updated English and Indonesian Codex documentation to install `vibegram@^2.2.1` and import Codex helpers from `vibegram/codex`.

---

## [2.2.0] - 2026-05-22

### Added

- Added Phase 0 official plugin infrastructure with a `plugins/` workspace convention, package template, root plugin validation scripts, and English/Indonesian plugin development documentation.
- Added the official `@vibegram/runner` plugin package for concurrent long polling with configurable concurrency, per-chat ordering, queue backpressure, graceful shutdown, lifecycle hooks, metrics-friendly counters, tests, and English/Indonesian documentation.
- Added `TelegramClient.use()` request transformers plus the official `@vibegram/auto-retry` plugin for retrying Telegram API 429, network, and HTTP 5xx failures with bounded backoff, method filters, safe retry hooks, tests, and English/Indonesian documentation.
- Added the official `@vibegram/throttler` plugin package for outgoing Telegram API flood control with global, per-chat, and per-method buckets, priority scheduling, bounded queues, optional oldest-drop behavior, graceful drain controls, tests, and English/Indonesian documentation.
- Added `rateLimit({ store })` plus the official `@vibegram/storage-redis` plugin package with Redis-backed session, rate-limit, and Codex memory stores, TTL/prefix support, predictable corrupt JSON errors, tests, and English/Indonesian documentation.
- Added the official `@vibegram/parse-mode` plugin package with safe HTML and MarkdownV2 builders, escaping helpers, safe links, default parse-mode middleware, `ctx.replyFmt()`, tests, and English/Indonesian documentation.
- Added the official `@vibegram/files` plugin package with `ctx.file()`, Telegram `getFile` metadata resolution, buffer/stream/local file downloads, safe filename handling, file size/type guards, storage adapter support, tests, and English/Indonesian documentation based on official Telegram Bot API file rules.
- Added the official `@vibegram/hydrate` plugin package with non-enumerable helpers for messages, callback queries, chats, users, and API message results, including `message.reply()`, `message.editText()`, `message.delete()`, `message.pin()`, `callbackQuery.answer()`, typed `HydrateFlavor`, tests, and English/Indonesian documentation.
- Added the official `@vibegram/commands` plugin package with a central command registry, Telegram `setMyCommands` sync, scoped command sets, localized descriptions, generated `/help`, duplicate validation, typed `CommandsFlavor`, tests, and English/Indonesian documentation.
- Added the official `@vibegram/router` plugin package with declarative route-key middleware, session/chat/update type helpers, async resolver support, fallback routes, composer-like route handlers, typed route keys, tests, and English/Indonesian documentation.
- Added the official `@vibegram/chat-members` plugin package with cached `getChatMember` lookups, `chat_member`/`my_chat_member` invalidation, admin/owner/membership guards, typed `ChatMembersFlavor`, tests, and English/Indonesian documentation.
- Added the official `@vibegram/devtools` plugin package with sanitized update snapshots, middleware timing spans, outgoing Telegram API debug logs, JSONL sinks, replay fixtures, production-safe capture defaults, tests, and English/Indonesian documentation.
- Added the official `@vibegram/deploy` plugin package with native webhook launch, Express/Fastify/Hono presets, health/readiness endpoints, environment validation, reverse-proxy webhook URL helpers, graceful shutdown wiring, Docker/systemd recipes, tests, and English/Indonesian documentation.
- Added the official `@vibegram/security` plugin package with user/chat allowlists, Telegram `getChatMember` admin guards, webhook secret verification, spam burst protection, safe error replies, reusable redaction helpers, tests, and English/Indonesian documentation.
- Added the official `@vibegram/observability` plugin package with update duration metrics, Telegram API request metrics, error counters, redacted structured logging, optional OpenTelemetry/Sentry hooks, tests, and English/Indonesian documentation.
- Added the official `@vibegram/webapp-kit` plugin package with Telegram Mini App `initData` validation, typed launch payload parsing, safe `web_app_data` JSON parsing, WebApp reply helpers, normalized HMAC errors, tests, and English/Indonesian documentation.
- Added the official `@vibegram/stars` plugin package with Telegram Stars invoice building, pre-checkout approval/decline helpers, successful payment validation, refund wrappers, gift/business Stars workflows, paid update fixtures, tests, and English/Indonesian documentation.
- Added experimental Codex device-code login/logout support so Telegram bot operators can start a browser login flow from `/codex login`, persist Codex-compatible auth JSON, and clear it with `/codex logout`.

### Changed

- Updated the English and Indonesian plugin docs landing pages into a current official plugin catalog with install guidance and an explicit rule to follow official Telegram Bot API references for Bot API-backed plugins.

## [2.1.0] - 2026-04-29

### Added

- Added the experimental `@vibegram/codex` package under `experimental/codex` for connecting VibeGram Telegram bots to ChatGPT/Codex sessions through `codex()` middleware and `codexProvider()`.
- Added `ctx.codex` helpers for asking Codex, checking status, listing models, resetting conversation history, and managing per-user custom instructions.
- Added built-in `/codex` commands for help, status, model listing, explicit prompts, conversation reset, and personality management.
- Added session-token provider support for Codex `auth.json`, ChatGPT account headers, stable device IDs, SSE response parsing, request retries, timeout aborts, and optional token auto-refresh.
- Added local memory, usage tracking, group mention safeguards, audit callbacks, live Telegram smoke-test examples, and unit tests for the experimental Codex plugin.
- Added English and Indonesian Codex plugin documentation, including server-first secret setup, deployment recipes, persistence guidance, `auth.json` handling, local smoke-test commands, provider options, troubleshooting, and security guidance.
- Added internal English and Indonesian changelog pages for docs users, with GitHub links to the full release history.

### Changed

- Added VitePress navigation entries for `AI Plugins` / `Plugin AI` and the new Codex documentation pages.
- Updated the root dependency pin from `axios` `1.15.0` to `1.15.2`.

### Tests

- Added and validated Codex plugin/provider regression coverage for context injection, memory failure behavior, timeout aborts, group mention detection, status commands, `/responses` payloads, headers, and SSE parsing.
- Validated the experimental Codex package with typecheck, tests, and build, and validated the VitePress docs build.

## [2.0.0] - 2026-04-27

### Breaking Changes

- Removed deprecated forward-message fields from `Message`: `forward_from`, `forward_from_chat`, `forward_from_message_id`, `forward_signature`, `forward_sender_name`, and `forward_date`. Use `forward_origin` for modern Bot API-compatible forwarded-message data.
- Removed the deprecated singular `ExtraPoll.correct_option_id` alias. Use `correct_option_ids` for quiz poll answers.
- Split compact update chat data from full chat metadata more strictly: `Chat` now represents lightweight chat identity from updates, while `getChat()` returns `ChatFullInfo` for rich metadata such as permissions, description, photo, accepted gift settings, parent chat, rating, and related full-info fields.

### Added

- Added opt-in Telegram client network retries via `networkRetries`, `networkRetryBaseDelayMs`, and `networkRetryMaxDelayMs` for network failures and HTTP 5xx responses.
- Added `AdapterOptions.healthPath` for Express, Fastify, Hono, Koa, and native HTTP webhook adapters.
- Added native graceful webhook launch mode through `bot.launch({ webhook: { url, port, secretToken, path, healthPath } })`, including shutdown support via `bot.stop()`.
- Added `ConversationManager.cancelAll()` for custom persistence and graceful shutdown workflows.
- Added `ConversationContext.waitForAny()` with a discriminated union result for text, callback queries, and supported media updates.
- Added `ctx.telegram` as a discoverable alias for the scoped `TelegramClient`.
- Added typed `guard()` middleware overloads for predicate-based context narrowing.
- Added public subpath exports for modules such as markup, filters, errors, types, adapters, conversations, sessions, scenes, queues, rate limiting, plugins, inline builders, and web app helpers.
- Added business account wrappers including account name, username, bio, profile photo, gift settings, business message reads/deletes, and business connection lookup.
- Added gift and story wrappers including premium subscription gifting, gift upgrade/transfer, chat gifts, and story post/edit/delete/repost helpers.
- Added periodic cleanup controls for `MemorySessionStore` via `cleanupExpired()`, `close()`, and `cleanupIntervalMs`.

### Changed

- Hardened `rateLimit()` default key generation with fallbacks for updates without `from` or `chat`, plus optional `strictMode`.
- Validated `TelegramClient.callApi()` payload boundaries with plain-object root checks and configurable JSON payload size limits.
- Updated webhook adapters so health checks bypass secret-token validation, body parsing, and update handling.
- Expanded JSDoc examples for key public APIs including `Bot`, common context replies, callback answers, chat administration, polls, chat actions, reactions, and middleware guards.
- Updated English and Indonesian docs for webhook launch mode, health checks, conversations, API methods, business flows, security, queueing, installation, and migration guidance.
- Rebuilt the VitePress documentation experience with a custom theme, Tailwind/shadcn-vue style system, reusable docs components, local search UI, responsive navigation, motion controls, GitHub Pages-safe links, and EN/ID content sync.

### Fixed

- Fixed `InlineKeyboardButton.copy_text` type coverage so copy-text keyboard buttons match runtime markup output.
- Fixed docs language parity by adding the missing Indonesian Observability page and syncing sidebar structure.
- Fixed docs internal links for GitHub Pages static hosting by resolving internal markdown-style routes to `.html` output paths where needed.

### Performance

- Optimized trigger regex handling so non-stateful regular expressions are reused while global/sticky expressions are still cloned to prevent `lastIndex` leakage.

### Tests

- Added regression coverage for rate-limit fallback behavior, client payload validation, network retries, adapter health checks, native webhook launch mode, graceful shutdown paths, typed guards, package subpath exports, business/gift/story wrappers, conversation `waitForAny()`, type-level breaking changes, and docs build validation.
- Full release validation passed locally with lint, source/test/example type checks, Vitest, library build, docs build, and npm dry pack.

## [1.2.1] - 2026-04-25

### Added

- Added GitHub issue templates for bug reports and feature requests.

### Changed

- Updated agent release guidance to mark `1.1.0` as a burned version and document `1.2.0` as the current published baseline.
- Normalized the repository URL metadata to npm's canonical `git+https` format.
- Updated the next-update plan to reflect Phase A completion and validation status.

### Fixed

- Added the missing `copy_text` field to `InlineKeyboardButton` so `Markup.button.copy()` matches the exported TypeScript types.

### Tests

- Added type coverage for copy-text inline keyboard buttons.

## [1.2.0] - 2026-04-25

### Added

- Added broader typed Telegram Bot API coverage for webhook management, bot profile settings, menu buttons, administrator rights, profile photos/audio, invoices, Web App answers, passport errors, games, stickers, invite links, forum tools, multi-message helpers, and modern message/service objects.
- Added ergonomic runtime helpers for `Composer.start()`, `Composer.help()`, `Composer.settings()`, `ctx.replyQuote()`, topic-aware reply helpers, wizard back/goto controls, and scene re-entry.
- Added security policy documentation plus English and Indonesian quickstart, migration, and deployment docs.

### Changed

- Improved webhook secret-token validation reuse across adapters and bot callbacks.
- Updated README, VitePress navigation, contribution guidance, and package description to describe the supported API surface more accurately.

### Fixed

- Redacted Telegram bot tokens from Axios error configs, response configs, and error messages before surfacing client errors.
- Hardened session assignment against prototype-pollution keys when middleware replaces `ctx.session`.
- Updated forwarded-message detection to use modern `forward_origin` data while preserving legacy fallbacks.

### Tests

- Added regression coverage for client redaction, session hardening, webhook secret matching, modern forward filters, command aliases, context helpers, scene re-entry, wizard controls, and expanded type coverage.

## [1.0.1] - 2026-04-17

### Fixed

- Multipart upload serialization now follows Telegram's official `attach://` pattern for nested file payloads such as media groups and sticker inputs.
- Per-update client isolation now prevents middleware API wrappers from leaking across concurrent updates.
- Conversation default timeout now behaves as an inactivity timeout instead of expiring active flows from their original start time.
- RegExp-based `hears()` and `action()` handlers now avoid `lastIndex` leakage when consumers use `g` or `y` flags.

### Changed

- Repository presentation was polished for GitHub and VitePress landing pages, including clearer maintainer-document references and cleanup of malformed text artifacts.

## [1.0.0] - 2026-04-17

### Added

- Broad current-era Telegram Bot API support for reactions, business flows, checklists, paid media, gifts, Stars, suggested posts, and modern service messages.
- Lifecycle observability hooks for bot launch/stop, update processing, webhook failures, polling failures, and outbound Telegram client requests.
- Smoke-tested import-safe examples for the main public workflows.
- Release engineering and quality documentation, including parity reports, release checklist, and quality baselines.

### Changed

- `Context` helper coverage now includes media editing, live-location editing, game sending, business-account gifts and Star balances, gift delivery to chats, and suggested-post moderation flows.
- Core type coverage was expanded significantly across modern Telegram objects and service-message families, replacing most remaining `any` placeholders.
- Docs and repository messaging now describe support level more accurately as broad Bot API support rather than exhaustive parity.
- CI, build, docs, examples, and coverage validation are now part of the stable release workflow.

### Fixed

- Conversation wait-state validation, webhook response handling, polling shutdown, middleware invalidation, and multiple runtime edge cases uncovered during the audit and stabilization phases.
- Inline message editing, business connection propagation, adapter safety checks, and queue cancellation behavior.
- Logger sanitization, WebApp validation, adapter input validation, and several production-hardening issues.

### Security

- Added stronger request boundary validation, safer logging defaults, webhook hardening, runtime dependency auditing, and automated dependency update policy.

### Tests

- Test suite expanded to 200 passing tests with coverage, smoke-tested examples, and regression coverage for modern Telegram API families.

## [1.0.0-rc.2] - 2026-04-15

### Fixed

- Conversation wait-state validation now correctly preserves `WaitOptions`, emits validation feedback, and clears timers without leaking state.
- Webhook handlers now return accurate HTTP responses (`400`, `403`, `413`, `415`, `500`) and avoid double-writing responses.
- Inline message editing now works across context helpers and menu navigation.
- Broadcast cancellation is now tracked per job instead of using a shared global flag.
- WebApp validation now enforces typed errors, required `auth_date`, invalid future timestamps, and malformed hash rejection.
- Logger output now sanitizes user-controlled text and supports redaction and truncation.

### Changed

- CI now runs source, test, and example type-checks; coverage; runtime dependency audit; and the full build pipeline.
- TypeDoc output now goes to `generated/api/` and package/docs URLs are aligned with the published repository.
- Examples were updated to match current public typings and reply markup contracts.
- Coverage thresholds are now enforced against the current baseline so the CI gate stays useful without blocking the release artificially.

### Security

- Runtime dependency resolution now pins `follow-redirects` to a non-vulnerable release via `overrides`.

### Tests

- Test suite expanded to 156 passing tests across runtime, adapters, logging, security, queueing, and documentation-facing examples.

## [1.0.0-rc.1] — 2026-04-12

### 🚀 Added — Feature Completion (Bot API 9.6 Parity)

**Markup:**

- `Markup.grid(buttons, columns)` — Auto-arrange flat button arrays into grid keyboards
- `Markup.button.login(text, loginUrl)` — Telegram Login Widget (OAuth) buttons
- `Markup.button.copy(text, textToCopy)` — Copy-to-clipboard buttons (Bot API 9.6)
- `Markup.keyboard()` — Added `input_field_placeholder` and `selective` options

**Framework Adapters (`src/adapters.ts`):**

- `createExpressMiddleware()` — Express.js 4+ adapter
- `createFastifyPlugin()` — Fastify v4+ plugin
- `createHonoHandler()` — Hono v3+ adapter
- `createNativeHandler()` — Node.js native `http`/`https` adapter
- `createKoaMiddleware()` — Koa v2+ adapter
- All adapters validate `X-Telegram-Bot-Api-Secret-Token` and `update_id`

**Context Methods — 40+ new methods:**

- **Forum Topics** — `createForumTopic`, `editForumTopic`, `closeForumTopic`, `reopenForumTopic`, `deleteForumTopic`, `unpinAllForumTopicMessages`, `editGeneralForumTopic`, `hideGeneralForumTopic`, `unhideGeneralForumTopic`
- **Star Gifts & Monetization** — `getAvailableGifts`, `sendGift`, `getUserGifts`, `convertGiftToStars`, `saveGift`, `getStarBalance`, `refundStarPayment`, `getStarTransactions`
- **Verification** — `verifyUser`, `removeUserVerification`, `verifyChat`, `removeChatVerification`
- **Sticker Management** — `uploadStickerFile`, `createNewStickerSet`, `addStickerToSet`, `deleteStickerFromSet`, `setStickerSetThumbnail`, `getStickerSet`, `getCustomEmojiStickers`
- **Admin** — `deleteUserMessagesFromChat`, `setChatAdministratorCustomTitle`, `getChatAdministrators`, `getUserChatBoosts`, `unpinAllChatMessages`
- **Chat Metadata** — `setChatPhoto`, `deleteChatPhoto`, `setChatTitle`, `setChatDescription`
- **Misc** — `replyWithDice` (typed emoji union), `replyWithChecklist`, `answerShippingQuery`, `getEmojiReactionPacks`, `readBusinessStory`

**Bot core (breaking improvements):**

- `bot.launch()` validates token via `getMe()` before polling — throws `InvalidTokenError` on bad token
- `bot.stop()` is now `async` — waits for all in-flight update handlers
- `bot.launch()` auto-registers `SIGINT`/`SIGTERM` signal handlers
- `bot.webhookCallback()` returns HTTP 400 on invalid body
- Added `bot.deleteWebhook()`, `bot.getWebhookInfo()`, Managed Bot API 9.6 methods
- `handleUpdate()` accepts typed `Update` instead of `any`

**Error Hierarchy (`src/errors.ts`):**

- New: `VibeGramError`, `TelegramApiError`, `NetworkError`, `RateLimitError`, `InvalidTokenError`, `WebAppValidationError`, `ConversationTimeoutError`
- Proper `instanceof` chain, typed properties (`errorCode`, `retryAfter`, `chatId`, `originalError`)
- Exported from main entry point

**ctx.match — RegExp capture groups:**

- `hears()` and `action()` inject `ctx.match = regex.exec(text)` on RegExp matches
- `ctx.match` is `null` for plain string matches

**Conversation Engine:**

- `ConversationOptions.defaultTimeout` (default: 5 min) prevents memory leaks
- Auto-cleanup timer with `unref()` — Node.js exits cleanly

**Type Safety (`types.ts`):**

- Added `ReplyParameters`, `ReplyMarkup`, `ExtraPoll`, `ExtraBanMember`, `ExtraRestrictMember`, `ExtraPromoteMember`, `ExtraInviteLink`
- Eliminated `any` across `replyWithPoll`, `banChatMember`, `restrictChatMember`, `promoteChatMember`, `setChatPermissions`, `createChatInviteLink`

### 🧪 Tests — 126 tests, 10 test files (all passing ✅)

- Full coverage across Composer, Context, Session, Markup, RateLimit, WebApp, Errors, Conversation, Adapters

### 🔧 Fixed

- Removed duplicate `replyWithDice` method (kept typed version with emoji union)
- Removed deprecated `@types/form-data` from devDependencies

### 🏗️ Infrastructure

- ESLint, Prettier, Vitest with coverage
- Dual output: CJS (`dist/cjs/`) + ESM (`dist/esm/`)
- TypeDoc config (`typedoc.json`) for API reference
- GitHub Actions CI (Node 18/20/22 matrix + auto-publish)
- `examples/redis-session.ts` and `examples/full-bot.ts`
- Updated `package.json`, `README.md`
