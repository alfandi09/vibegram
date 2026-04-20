# Changelog

All notable changes to VibeGram are documented in this file.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

## [1.1.2] - 2026-04-20

### Changed

- Switched npm publishing to a tag-driven GitHub Actions flow instead of publishing on every push to `main`.
- Added stronger publish guards in CI so tag/version mismatches and already-published versions are detected before `npm publish` runs.

## [1.1.1] - 2026-04-20

### Fixed

- Resolved follow-up lint errors in the plugin API generic defaults so CI and publish flows complete cleanly.

### Changed

- Normalized `repository.url` to the `git+https` format expected by npm publish.

## [1.1.0] - 2026-04-20

### Added

- Introduced a registry-backed plugin runtime with `definePlugin()`, plugin metadata, dependency ordering, and bot-level plugin inspection helpers.
- Added plugin lifecycle support through `setup()` and `teardown()`, plus explicit `initializePlugins()` and `teardownPlugins()` bot methods.
- Added a shared plugin service registry with `provide()`, `require()`, and `has()` access from `PluginContext`.
- Added first-party plugin wrappers for logger, rate limiting, i18n, and session middleware.
- Added maintainer-facing technical design documentation for the plugin API rollout.

### Changed

- The plugin documentation and README examples now recommend definition-based plugins as the primary authoring model.
- `rateLimitPlugin()` now manages its cleaner through plugin lifecycle hooks and exposes its resolved store as a shared service.
- `sessionPlugin()` now exposes the same resolved store instance used by the installed session middleware.

### Tests

- Expanded regression coverage for plugin registration, dependency checks, shared services, lifecycle ordering, and first-party plugin wrappers.

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
