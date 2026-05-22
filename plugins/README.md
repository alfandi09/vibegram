# VibeGram Official Plugins

Official plugins live in this directory.

Use `plugins/_template` when creating a new plugin package. Experimental or unstable provider research should stay in `experimental/` until its API is ready for public plugin conventions.

## Current Packages

| Directory | Package | Purpose |
| --- | --- | --- |
| `runner/` | `@vibegram/runner` | Concurrent long polling with bounded concurrency, per-chat ordering, backpressure, and graceful shutdown |
| `auto-retry/` | `@vibegram/auto-retry` | Outgoing Telegram API retry transformer for 429, network, and HTTP 5xx failures |
| `throttler/` | `@vibegram/throttler` | Outgoing Telegram API queue and flood-control transformer with global, per-chat, and per-method buckets |
| `storage-redis/` | `@vibegram/storage-redis` | Redis-backed stores for sessions, inbound rate limits, and Codex memory |
| `parse-mode/` | `@vibegram/parse-mode` | Safe HTML and MarkdownV2 formatting helpers with default parse-mode middleware |
| `files/` | `@vibegram/files` | Telegram file helpers for resolving, downloading, streaming, saving, and storing message media |
| `hydrate/` | `@vibegram/hydrate` | Non-enumerable helper methods for Telegram messages, callback queries, chats, users, and API message results |
| `commands/` | `@vibegram/commands` | Command registry, Telegram command menu sync, scoped/localized command sets, and generated help output |
| `router/` | `@vibegram/router` | Declarative route-key middleware for session flows, chat types, update types, and custom resolvers |
| `chat-members/` | `@vibegram/chat-members` | Cached `getChatMember` lookups, member-update invalidation, and admin/owner/membership guards |
| `devtools/` | `@vibegram/devtools` | Sanitized update capture, middleware timing, API logs, JSONL debugging, and replay fixtures |

## Package Rules

- Package names use the `@vibegram/*` scope.
- `vibegram` must be a peer dependency.
- Build output must be dual CJS + ESM with type declarations.
- Runtime dependencies must be small and justified.
- Public exports must be documented.
- Every plugin needs focused tests before being added to root validation.

## Validation

Root scripts:

```bash
npm run plugins:typecheck
npm run plugins:test
npm run plugins:build
npm run plugins:validate
```

`plugins/_template` is ignored by these scripts.
