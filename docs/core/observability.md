# Observability

VibeGram exposes lightweight lifecycle hooks for request tracing, error tracking,
and operational telemetry without requiring additional dependencies.

## Bot Lifecycle Hooks

Use bot observability hooks to instrument polling, webhook handling, and update
execution.

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!, {
    observability: {
        hooks: {
            onLaunch: ({ botInfo }) => {
                console.log(`Bot ${botInfo.username} is online`);
            },
            onUpdateStart: ({ updateType }) => {
                console.log(`Starting ${updateType}`);
            },
            onUpdateSuccess: ({ updateType, durationMs }) => {
                console.log(`${updateType} completed in ${durationMs}ms`);
            },
            onUpdateError: ({ updateType, error, durationMs }) => {
                console.error(`${updateType} failed after ${durationMs}ms`, error);
            },
            onPollingError: ({ error }) => {
                console.error('Polling failed', error);
            },
            onWebhookError: ({ error, update }) => {
                console.error('Webhook update failed', error, update);
            },
        },
    },
});
```

## Telegram Client Hooks

Use client hooks to observe outgoing Bot API traffic, retries, and errors.

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!, {
    observability: {
        client: {
            onRequestStart: ({ method, attempt }) => {
                console.log(`Calling ${method} (attempt ${attempt})`);
            },
            onRateLimitRetry: ({ method, retryAfter, remainingRetries }) => {
                console.warn(
                    `${method} rate-limited, retrying in ${retryAfter}s (${remainingRetries} retries left)`
                );
            },
            onRequestError: ({ method, statusCode, error }) => {
                console.error(`Telegram API ${method} failed`, statusCode, error);
            },
        },
    },
});
```

## Notes

1. Hooks are observational only. If a hook throws, VibeGram logs the hook error and continues processing.
2. The built-in `logger()` middleware is still useful for human-readable traces; hooks are better for metrics, tracing, and structured logging.
3. `rateLimit()` already exposes `onLimitExceeded`, which can be used as a dedicated throttling signal.
