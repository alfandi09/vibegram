# Devtools

`@vibegram/devtools` records sanitized update snapshots, middleware timing spans, outgoing Telegram API call logs, and replay fixtures for local debugging.

Use it when a bug only happens with real Telegram updates, when you need a minimal fixture for a regression test, or when middleware performance needs a simple timing trail.

## Official Telegram Mapping

This plugin records Telegram `Update`-like objects already delivered to your bot and can replay those objects into a bot-like `handleUpdate(update)` target.

It does not call Telegram by itself. It wraps `ctx.client.callApi()` during the current update to log method names, sanitized request payloads, duration, success/failure, and optionally sanitized responses.

References: [Telegram Bot API Update](https://core.telegram.org/bots/api#update), [getUpdates](https://core.telegram.org/bots/api#getupdates), and [Making requests](https://core.telegram.org/bots/api#making-requests).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/devtools
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/devtools": "file:../vibegram/plugins/devtools"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { devtools } from '@vibegram/devtools';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(devtools({
    capture: process.env.NODE_ENV !== 'production',
    jsonlPath: '.vibegram/events.jsonl',
    redact: ['session', 'authorization'],
}));

await bot.launch();
```

If `capture` is omitted, devtools records outside production and does nothing when `NODE_ENV=production`.

## Captured Events

Devtools writes JSON events to a sink. The built-in JSONL sink writes one event per line:

```typescript
bot.use(devtools({
    capture: true,
    jsonlPath: '.vibegram/events.jsonl',
}));
```

Common event types:

| Type | Meaning |
| --- | --- |
| `update` | Sanitized update snapshot |
| `api` | Telegram API method, request, duration, and result status |
| `timing` | Middleware timing span |
| `error` | Sanitized thrown error metadata |

The default redacted keys include `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, and `prompt`.

## Timing Spans

Use `ctx.devtools.time()` inside handlers:

```typescript
bot.command('report', async ctx => {
    const data = await ctx.devtools.time('load-report-data', () => loadReport(ctx.from.id));
    await ctx.reply(renderReport(data));
});
```

Or wrap a middleware:

```typescript
import { withDevtoolsTiming } from '@vibegram/devtools';

bot.use(withDevtoolsTiming('auth', authMiddleware));
```

Every captured update also emits a `timing` event named `update`.

## API Logs

Devtools wraps the scoped `ctx.client.callApi()` for the current update:

```typescript
bot.use(devtools({
    capture: true,
    includeApiResult: false,
}));
```

`includeApiResult` defaults to `false` because Telegram responses can include user data. Enable it only while debugging and rely on sanitizer redaction.

## Replay

Use `createReplayFixture()` to export one sanitized update for a test:

```typescript
import { createReplayFixture, replayUpdates } from '@vibegram/devtools';

const fixture = createReplayFixture(ctx.update);

await replayUpdates(bot, [fixture]);
```

`replayUpdates()` accepts either a function:

```typescript
await replayUpdates(update => bot.handleUpdate(update), [fixture]);
```

or a bot-like object:

```typescript
await replayUpdates(bot, [fixture]);
```

For JSONL files captured by the sink:

```typescript
import { replayJsonl } from '@vibegram/devtools';

await replayJsonl(bot, '.vibegram/events.jsonl');
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `capture` | `boolean \| (ctx) => boolean \| Promise<boolean>` | disabled in production | Controls whether an update is captured |
| `env` | `string` | `process.env.NODE_ENV` | Used for production default detection |
| `sink` | `DevtoolsSink` | console sink | Custom event sink |
| `jsonlPath` | `string` | none | Writes events to JSONL when `sink` is omitted |
| `redact` | `string[]` | sensitive defaults | Additional keys to redact |
| `replacement` | `string` | `[REDACTED]` | Replacement for redacted values |
| `maxDepth` | `number` | `12` | Maximum sanitizer traversal depth |
| `includeApiResult` | `boolean` | `false` | Include sanitized API responses |
| `failOnSinkError` | `boolean` | `false` | Throw if sink writing fails |
| `clock` | `() => number` | `Date.now` | Custom clock for tests |

## TypeScript

Use `DevtoolsFlavor` when custom context code accesses `ctx.devtools`:

```typescript
import type { DevtoolsFlavor } from '@vibegram/devtools';

type MyContext = DevtoolsFlavor<Context>;

async function profile(ctx: MyContext) {
    return ctx.devtools.time('profile', () => loadProfile(ctx.from.id));
}
```

The package also exports `DevtoolsSink`, `DevtoolsLogEvent`, `DevtoolsUpdate`, `MemoryDevtoolsSink`, `createJsonlSink()`, `createConsoleSink()`, `readJsonlReplay()`, `replayJsonl()`, and `sanitizeValue()`.

## Failure Modes

- Sink write failures are ignored by default so debug tooling does not break bot handling.
- Set `failOnSinkError: true` in tests when the sink itself must be validated.
- Captured fixtures are sanitized clones; non-JSON values such as functions become markers.
- Replay does not contact Telegram. It only feeds saved update objects back into local code.

## Security Notes

Do not store raw production updates unless you have a retention policy and explicit user-data handling rules. Telegram updates can contain names, usernames, message text, file IDs, locations, and payment-related data.

Keep `capture` disabled in production unless a debugging window is intentional. Add project-specific redaction keys for sessions, auth headers, prompts, internal IDs, and business payloads before writing JSONL files.

## Validation

The package includes tests for sanitized update capture, replay fixtures, middleware timing, API log redaction, production capture defaults, JSONL writing, and timing wrappers.

```bash
npm run plugins:validate
npm run docs:build
```
