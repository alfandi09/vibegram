# Plugins

VibeGram official plugins live in `plugins/`. They are small, focused packages that keep the core framework stable while adding production building blocks around polling, retries, storage, formatting, files, hydration, command management, routing, member guards, debugging, deployment, security, observability, Telegram Mini Apps, and Stars payments.

Experimental provider research and unstable integrations live in `experimental/` until their API is ready for public use.

## Official Plugin Catalog

| Plugin | Package | Use it for |
| --- | --- | --- |
| Runner | `@vibegram/runner` | Higher-throughput long polling with bounded concurrency, per-chat ordering, backpressure, and graceful shutdown |
| Auto Retry | `@vibegram/auto-retry` | Retrying outgoing Telegram API calls for 429, temporary network errors, and HTTP 5xx responses |
| Throttler | `@vibegram/throttler` | Queueing and pacing outgoing Telegram API calls before flood limits are hit |
| Redis Storage | `@vibegram/storage-redis` | Redis-backed session, rate-limit, and Codex memory stores |
| Parse Mode | `@vibegram/parse-mode` | Safe HTML and MarkdownV2 builders plus default parse-mode middleware |
| Files | `@vibegram/files` | Resolving, downloading, streaming, saving, and storing Telegram message media |
| Hydrate | `@vibegram/hydrate` | Non-enumerable helper methods on messages, callback queries, chats, users, and message API results |
| Commands | `@vibegram/commands` | Central command registry, `setMyCommands` sync, scopes, localization, and generated `/help` output |
| Router | `@vibegram/router` | Declarative route-key middleware for session flows, chat types, update types, and custom resolvers |
| Chat Members | `@vibegram/chat-members` | Cached `getChatMember` lookups, member-update invalidation, and admin/owner/membership guards |
| Devtools | `@vibegram/devtools` | Sanitized update capture, middleware timing, API logs, JSONL debugging, and replay fixtures |
| Deploy | `@vibegram/deploy` | Webhook server launch, framework presets, health/readiness endpoints, env validation, and graceful shutdown |
| Security | `@vibegram/security` | User/chat allowlists, admin guard, spam burst guard, safe errors, webhook secret checks, and redaction helpers |
| Observability | `@vibegram/observability` | Update/API duration metrics, error counters, redacted structured logs, and OpenTelemetry/Sentry hooks |
| WebApp Kit | `@vibegram/webapp-kit` | Telegram Mini App `initData` validation, typed launch payload parsing, WebApp button helpers, and frontend/server integration guidance |
| Stars | `@vibegram/stars` | Telegram Stars invoices, pre-checkout validation, successful payment handling, refunds, gift/business helpers, and paid update fixtures |

## Install Pattern

When a plugin package is published, install it next to `vibegram`:

```bash
npm install vibegram @vibegram/runner
```

During local development, use a file dependency from this repository:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/runner": "file:../vibegram/plugins/runner"
  }
}
```

## Telegram API Reference Rule

Plugins that wrap Telegram Bot API behavior must follow the official Telegram docs first:

- Use the official method names and parameter names.
- Preserve Telegram limits, permission rules, and failure behavior in docs.
- Document whether the plugin calls Telegram directly, decorates `ctx.client`, or only adds local helpers.
- Link the relevant official Bot API method in the plugin page when a feature maps to a Telegram method.

Reference: [Telegram Bot API](https://core.telegram.org/bots/api).

## Directory Policy

Use `plugins/` for official plugin packages:

```text
plugins/
  runner/
  auto-retry/
  throttler/
  storage-redis/
  parse-mode/
  files/
  hydrate/
  commands/
  router/
  chat-members/
  devtools/
  deploy/
  security/
  observability/
  webapp-kit/
  stars/
```

Use `experimental/` for features that may change quickly:

```text
experimental/
  codex/
```

This keeps stable plugin contracts separate from research code.

## Package Naming

Official plugins use the `@vibegram/*` scope:

| Plugin | Package |
| --- | --- |
| Runner | `@vibegram/runner` |
| Auto retry | `@vibegram/auto-retry` |
| Throttler | `@vibegram/throttler` |
| Redis storage | `@vibegram/storage-redis` |
| Parse mode | `@vibegram/parse-mode` |
| Files | `@vibegram/files` |
| Hydrate | `@vibegram/hydrate` |
| Commands | `@vibegram/commands` |
| Router | `@vibegram/router` |
| Chat Members | `@vibegram/chat-members` |
| Devtools | `@vibegram/devtools` |
| Deploy | `@vibegram/deploy` |
| Security | `@vibegram/security` |
| Observability | `@vibegram/observability` |
| WebApp Kit | `@vibegram/webapp-kit` |
| Stars | `@vibegram/stars` |

Keep `vibegram` as a peer dependency so plugin users control the framework version.

```json
{
  "peerDependencies": {
    "vibegram": ">=2.1.0"
  }
}
```

## Package Template

Start new plugins from:

```text
plugins/_template/
```

The template includes:

- dual CJS and ESM TypeScript configs
- type declaration output
- package exports
- package markers for `dist/cjs` and `dist/esm`
- a minimal middleware example
- a minimal test

Replace these placeholders before implementation:

- `__PLUGIN_NAME__`
- `__PLUGIN_EXPORT__`

## Required Package Shape

Every official plugin should include:

```text
plugins/<name>/
  src/index.ts
  tests/*.test.ts
  scripts/postbuild.js
  README.md
  package.json
  tsconfig.json
  tsconfig.esm.json
```

Every public plugin export must be documented in the plugin README and in the docs site once the plugin is public.

## Export Rules

Use one main public entry point:

```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

Only add subpath exports when the plugin has a real public module boundary.

## Runtime Dependency Rules

Prefer no runtime dependencies. Add one only when it clearly removes maintenance risk or implements a hard domain problem.

Good reasons:

- Redis client integration for storage adapters
- OpenTelemetry/Sentry adapters in optional observability packages
- A proven queue/throttle library if the internal implementation would be fragile

Weak reasons:

- Small helpers that can be written clearly in a few lines
- Cosmetic abstractions
- Dependencies that duplicate VibeGram core behavior

## Validation

Root-level plugin scripts are available:

```bash
npm run plugins:typecheck
npm run plugins:test
npm run plugins:build
npm run plugins:validate
```

`plugins:validate` runs typecheck, tests, and build for every official plugin package under `plugins/`.

The template directory is skipped.

Each plugin must also pass inside its package:

```bash
npm run typecheck
npm test
npm run build
```

## Documentation Requirements

Every public plugin needs:

- installation instructions
- minimal usage
- production usage
- options table
- TypeScript API notes
- failure modes
- security notes when relevant
- validation notes
- English docs page
- Indonesian docs page

## Release Notes

Do not bump versions during plugin implementation. Decide the version only after all planned plugin phases for the release are complete.

Before any release:

```bash
npm view vibegram versions --json
```

Never publish manually. The repository release workflow publishes from `main` after the local version differs from npm.
