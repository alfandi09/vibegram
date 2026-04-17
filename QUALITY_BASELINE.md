# Quality Baseline

This document tracks the current release-quality baseline for VibeGram and the
minimum checks expected before a prerelease or stable publish.

## Current Baseline

Measured on `v1.0.0` after the phase-four observability/DX pass and the latest Telegram API sync pass.

| Metric                   |     Current |
| ------------------------ | ----------: |
| Test files               |          22 |
| Tests                    | 200 passing |
| Coverage lines           |      71.37% |
| Coverage functions       |      65.86% |
| Coverage branches        |      82.50% |
| Source typecheck         |     Passing |
| Test typecheck           |     Passing |
| Example typecheck        |     Passing |
| Runtime dependency audit |     Passing |
| Docs build               |     Passing |
| API docs generation      |     Passing |

## Compatibility Matrix

| Surface           | Supported baseline                               |
| ----------------- | ------------------------------------------------ |
| Node.js           | 18.x, 20.x, 22.x                                 |
| Module output     | CommonJS + ESM                                   |
| Webhook adapters  | Express, Fastify, Hono, Koa, native Node.js HTTP |
| Release artifacts | `dist/cjs`, `dist/esm`, `dist/types`             |

## Required Release Checks

Run these commands before cutting a release candidate or stable release:

```bash
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run test:coverage
npm run build
npm run docs:build
npm run docs:api
npm audit --omit=dev --audit-level=high
npm run pack:dry
```

## Current Coverage Gate

Coverage remains enforced in CI against the current tested surface:

| Threshold | Minimum |
| --------- | ------: |
| Lines     |     40% |
| Functions |     45% |
| Branches  |     70% |

These thresholds should be raised only after the underlying module coverage has
improved and stayed stable across multiple CI runs.

## Priority Gaps After Phase One

The largest remaining test gaps are concentrated in modules that still drive a
large amount of runtime behavior:

1. `src/context.ts`
2. `src/bot.ts`
3. `src/queue.ts`
4. `src/client.ts`
5. `src/cache.ts`

## Phase-One Outcomes

The phase-one stabilization pass delivered these baseline improvements:

1. Added new automated coverage for `filters`, `i18n`, `plugin`, `scene`, `wizard`, and `inline`.
2. Fixed a stage propagation bug where `Scene` middleware could call the global chain twice.
3. Established a documented compatibility matrix and repeatable release checklist.
4. Raised the measured global coverage enough to make future gates more meaningful.

## Phase-Two Outcomes

The phase-two hardening pass added these baseline improvements:

1. Added fail-fast validation for adapter misconfiguration, WebApp verification inputs, and inline query builder payloads.
2. Hardened logger output with built-in secret-pattern redaction and stricter option validation.
3. Added Dependabot automation for npm and GitHub Actions updates.
4. Expanded security-focused docs for webhook deployment and logger usage.

## Phase-Three Outcomes

The phase-three efficiency pass added these baseline improvements:

1. Memoized hot-path `Context` getters (`message`, `chat`, `from`, `businessConnectionId`, `updateType`) to reduce repeated update traversal.
2. Removed a per-update no-op function allocation in `Bot.handleUpdate()`.
3. Aligned core `Message` and `ReplyParameters` typings with the latest Telegram Bot API fields used by modern bots.
4. Locked new behavior with regression tests for context caching and inline builder immutability.

## Phase-Four Outcomes

The phase-four observability and DX pass added these baseline improvements:

1. Added lifecycle hooks for bot launch/stop, update processing, webhook failures, polling failures, and Telegram client requests/retries.
2. Refactored primary examples into import-safe factories so they can be smoke-tested without launching network services.
3. Added smoke tests covering the main example flows (`basic`, `conversation`, `menu`, `queue`, `webhook`).
4. Added operational observability docs and a repeatable release checklist.

## Telegram API Sync Outcomes

The latest Telegram API sync pass added these baseline improvements:

1. Expanded core types for reactions, business connections, checklist payloads, paid media, direct-message topics, reply parameters, and managed bot updates.
2. Added modern context helpers for games, media editing, and live location editing/stopping.
3. Updated docs wording to avoid overclaiming full parity where feature families are still being completed.
4. Added regression tests for new context helpers, modern update getters, and compatibility handling for updated poll semantics.

## Monetization Sync Outcomes

The monetization parity pass added these baseline improvements:

1. Expanded type coverage for gifts, owned gifts, unique gifts, Star balances, Star transactions, transaction partners, and suggested post service messages.
2. Added context helpers for business-account gifts and Star balances, gift delivery to chats, and suggested-post approval/decline flows.
3. Improved monetization-era docs for the public context surface.
4. Increased `src/context.ts` coverage materially while keeping tests, typecheck, examples, and docs builds green.

## Non-Monetization Type Cleanup Outcomes

The non-monetization cleanup pass added these baseline improvements:

1. Replaced many remaining `any` placeholders in service-message types for payments, shares, forum topics, giveaways, chat boosts, auto-delete timers, and video chat lifecycle objects.
2. Added conservative but typed request-button and invite-link objects for common keyboard and membership flows.
3. Added regression coverage for the newly typed service-message families.
