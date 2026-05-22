# Auto Retry

`@vibegram/auto-retry` retries outgoing Telegram Bot API calls when failures are likely to be temporary. It is a `TelegramClient` request transformer installed with `bot.client.use()`.

## When to Use

Use this plugin when your bot sends messages, broadcasts, edits messages, or calls Telegram APIs often enough that transient failures should be handled centrally.

It retries:

- HTTP `429` flood-limit responses using Telegram `retry_after`
- network failures such as timeouts and connection resets
- Telegram HTTP `5xx` server errors

It does not retry normal `4xx` client errors such as malformed payloads.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/auto-retry
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/auto-retry": "file:../vibegram/plugins/auto-retry"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { autoRetry } from '@vibegram/auto-retry';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.client.use(autoRetry());

bot.on('message', ctx => ctx.reply('Hello with retry support.'));

await bot.launch();
```

## Production Setup

Use a bounded retry policy and log retry metadata without payloads:

```typescript
bot.client.use(
    autoRetry({
        maxRetries: Number(process.env.AUTO_RETRY_MAX_RETRIES ?? 3),
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        maxRetryAfterMs: 60_000,
        excludeMethods: ['sendInvoice'],
        onRetry(event) {
            console.warn('[telegram:auto-retry]', {
                method: event.method,
                reason: event.reason,
                retryAttempt: event.retryAttempt,
                delayMs: event.delayMs,
                error: event.error,
            });
        },
    })
);
```

## How It Composes

`autoRetry()` is installed as a `TelegramClient` transformer:

```typescript
bot.client.use(autoRetry());
```

The transformer disables the client's built-in rate-limit and network retry counters for requests it manages. This keeps retry behavior centralized in the plugin and prevents one request from going through two nested retry loops.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `maxRetries` | `3` | Maximum retry attempts after the initial failed request |
| `baseDelayMs` | `500` | Initial exponential backoff delay for network and HTTP 5xx errors |
| `maxDelayMs` | `10000` | Maximum exponential backoff delay |
| `maxRetryAfterMs` | `Infinity` | Maximum Telegram `retry_after` delay accepted before rethrowing |
| `jitter` | `0.2` | Adds jitter to backoff. Set `false` for deterministic delays |
| `includeMethods` | all | Retry only listed Bot API methods |
| `excludeMethods` | none | Never retry listed Bot API methods |
| `retryNonIdempotentMethods` | `true` | Retry write methods such as `sendMessage`; set `false` for read-only methods only |
| `redact` | Telegram token regex | Additional string or regex redactors for retry hook events |
| `onRetry` | none | Safe observability hook called before each retry |

## Recommended Defaults

For normal bots:

```typescript
bot.client.use(
    autoRetry({
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 10_000,
        maxRetryAfterMs: 60_000,
    })
);
```

For broadcasts, keep `maxRetryAfterMs` high enough to respect Telegram flood limits, but exclude methods that should not be repeated after they become stale.

```typescript
bot.client.use(
    autoRetry({
        maxRetries: 5,
        maxRetryAfterMs: 5 * 60 * 1000,
        excludeMethods: ['sendInvoice'],
    })
);
```

## Non-Idempotent Methods

Telegram write calls can have side effects. By default, the plugin retries them because handling flood limits for `sendMessage`, `editMessageText`, and similar methods is the main use case.

If your workflow cannot tolerate duplicate writes after uncertain network failures, disable non-idempotent retries:

```typescript
bot.client.use(
    autoRetry({
        retryNonIdempotentMethods: false,
    })
);
```

With that option, only `get*` methods are retried automatically.

## Auto Retry vs Throttling

Auto retry reacts after a request fails. Throttling controls request flow before Telegram rejects it.

| Concern | Auto retry | Throttling |
| --- | --- | --- |
| HTTP 429 recovery | yes | no |
| Network timeout recovery | yes | no |
| Preventing flood limits | no | yes |
| Queueing outgoing requests | no | yes |

Use both for high-volume bots: throttling to avoid floods, auto retry to recover from failures that still happen.

## Failure Modes

- If `maxRetries` is exhausted, the last error is rethrown.
- If Telegram `retry_after` exceeds `maxRetryAfterMs`, the rate-limit error is rethrown immediately.
- `onRetry` failures are ignored so observability code cannot break outgoing API calls.
- The plugin does not inspect request payloads, so it cannot deduplicate side effects for you.

## Security Notes

- `onRetry` receives metadata only. It does not receive request payloads or raw errors.
- Telegram-token-shaped strings are redacted from retry hook error messages.
- Add custom `redact` entries if your environment uses other secret formats.
- Do not log full message text from your own wrapper hooks unless your privacy policy allows it.

## Validation

The plugin is covered by tests for `retry_after`, network retries, HTTP 5xx retries, method filters, non-idempotent retry controls, and redacted retry hook events.

```bash
npm run plugins:validate
npm run docs:build
```
