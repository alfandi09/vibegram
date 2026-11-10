# Upgrading to 3.0

vibegram 3.0 is mostly additive. Three changes can break existing projects; each takes
a few minutes to fix.

## Breaking changes

### 1. Node.js 20 or newer

Node.js 18 reached end of life in April 2025, so 3.0 requires Node.js 20+
(`engines: { node: ">=20" }`). Upgrade the runtime on your servers and in CI.

### 2. Codex moved to `@vibegram/codex`

The ChatGPT/Codex plugin is no longer bundled in the core package. Install it
separately and change the import path; the API is unchanged.

```bash
npm install @vibegram/codex
```

```diff
- import { codex, codexProvider } from 'vibegram/codex';
+ import { codex, codexProvider } from '@vibegram/codex';
```

The core package is smaller, and projects that do not use Codex no longer ship its
session and auth code.

### 3. Removed deprecated aliases

| Removed | Use instead |
| --- | --- |
| `ctx.replyWithDraft(text, { random_id })` | `{ draft_id }` (a non-zero integer). `random_id` was never a Bot API parameter. |
| `Gift.gift_id` | `Gift.id`, as in the Bot API. (`UniqueGift.gift_id` is unchanged.) |

### Type corrections

These shipped in the same release cycle and may surface as compile errors where code
relied on the old, incorrect types (runtime values are unchanged):

- `ctx.copyMessages()` / `ctx.forwardMessages()` return `MessageId[]`, not `number[]`.
- `bot.setGameScore()` returns `Message | true`, not `boolean`.

## Unchanged defaults

`commandsOnEditedMessages` stays `true`, so commands still run when a user edits an old
command message. Set `new Bot(token, { commandsOnEditedMessages: false })` to opt out.

## New in 3.0

- [Bot API 10.3](/api/bot-methods#bot-api-103-methods): ephemeral messages, block-based rich messages, communities, draft stop buttons.
- [Filter queries](/core/handling#filter-queries) that narrow types: `bot.on('message:photo', ...)`.
- [Composer combinators](/core/middleware#combinators): `filter`, `branch`, `route`, `errorBoundary`, `chatType`, `reaction`, and more.
- [Edge runtimes](/adapters/fetch): `createFetchHandler()` for Cloudflare Workers, Deno, Bun, and Next.js.
- [Durable conversations](/state/durable-conversations) that survive restarts.
- [Testing kit](/advanced/testing): `vibegram/testing`.
- [AI streaming](/advanced/streaming) with drafts and a stop button, and the [Rich builder](/ui/rich-messages).
- `npm create vibegram@latest` project templates.
- Uploads keep file names (`{ source, filename }`), `apiRoot` for local Bot API servers, and many reliability fixes. See the [changelog](/changelog).
