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
            onStop: ({ reason }) => {
                console.log(`Bot stopped: ${reason ?? 'manual'}`);
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
import { Bot, TelegramClient } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!, {
    observability: {
        client: {
            onRequestStart: ({ method, attempt }) => {
                console.log(`Calling ${method} (attempt ${attempt})`);
            },
            onRequestSuccess: ({ method, durationMs }) => {
                console.log(`${method} succeeded in ${durationMs}ms`);
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

const client = new TelegramClient(process.env.BOT_TOKEN!, {
    networkRetries: 2,
    hooks: {
        onNetworkRetry: ({ method, retryAfterMs, remainingRetries }) => {
            console.warn(
                `${method} transient failure, retrying in ${retryAfterMs}ms (${remainingRetries} retries left)`
            );
        },
    },
});
```

## Notes

1. Hooks are observational only. If a hook throws, VibeGram logs the hook error and continues processing.
2. The built-in `logger()` middleware is still useful for human-readable traces; hooks are better for metrics, tracing, and structured logging.
3. `rateLimit()` already exposes `onLimitExceeded`, which can be used as a dedicated throttling signal.
4. Network retries are opt-in on `TelegramClient` via `networkRetries`; the default is `0` to avoid duplicate non-idempotent Bot API calls.
