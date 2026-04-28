# Changelog

Release notes for VibeGram. This page highlights the changes most useful for developers using the framework.

For the complete release log, see the repository [CHANGELOG.md](https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md).

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
