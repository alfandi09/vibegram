# Changelog

All notable changes to VibeGram are documented in this file.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

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

---

## [1.0.0] — Initial Release

- Initial public release of VibeGram
- Core Bot framework with Composer middleware pipeline
- Scene, Wizard, Session, I18n, Markup, RateLimit, WebApp validation
- Long-polling and webhook support
- Full Bot API v9.x type definitions
