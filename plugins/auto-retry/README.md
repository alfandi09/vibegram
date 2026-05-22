# @vibegram/auto-retry

Telegram API retry transformer for VibeGram bots.

Use this package when outgoing Bot API calls should recover from transient Telegram failures, network hiccups, and flood-limit responses without adding retry loops to every handler.

## Install

```bash
npm install vibegram @vibegram/auto-retry
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/auto-retry": "file:../vibegram/plugins/auto-retry"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { autoRetry } from '@vibegram/auto-retry';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.client.use(
    autoRetry({
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 10_000,
    })
);
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `maxRetries` | `3` | Maximum retry attempts after the first failed request |
| `baseDelayMs` | `500` | First delay for network and HTTP 5xx retries |
| `maxDelayMs` | `10000` | Maximum exponential backoff delay |
| `maxRetryAfterMs` | `Infinity` | Maximum Telegram `retry_after` delay accepted before rethrowing |
| `jitter` | `0.2` | Adds jitter to exponential backoff. Use `false` to disable |
| `includeMethods` | all | Retry only these Bot API methods |
| `excludeMethods` | none | Never retry these Bot API methods |
| `retryNonIdempotentMethods` | `true` | Retry write methods such as `sendMessage`. Set `false` for read-only retry behavior |
| `redact` | Telegram token regex | Extra string or regex redactors for retry hook events |
| `onRetry` | none | Safe retry hook with metadata only |

## Notes

The transformer disables VibeGram client's built-in rate-limit and network retries for requests it handles. This avoids duplicate retry loops and keeps retry policy in one place.

The `onRetry` event does not include request payloads or raw errors. Token-like values in error messages are redacted before they reach the hook.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
