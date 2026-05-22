# @vibegram/observability

Safe metrics, structured logging, and telemetry hooks for VibeGram bots.

Use it when a production bot needs update duration metrics, Telegram API request timing, error counters, redacted logs, and bridge hooks for OpenTelemetry or Sentry without adding runtime dependencies.

## Official Telegram Mapping

`@vibegram/observability` records metadata around Telegram `Update` objects and outgoing Bot API requests made through `ctx.client.callApi()`.

It does not change Telegram behavior, does not retry requests, and does not call Telegram by itself. Handler errors and API errors are rethrown after telemetry is recorded.

References:

- [Update](https://core.telegram.org/bots/api#update)
- [Making requests](https://core.telegram.org/bots/api#making-requests)
- [getUpdates](https://core.telegram.org/bots/api#getupdates)
- [setWebhook](https://core.telegram.org/bots/api#setwebhook)

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/observability
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/observability": "file:../vibegram/plugins/observability"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { observability } from '@vibegram/observability';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(observability({
    onMetric(metric) {
        metrics.emit(metric.type, metric);
    },
    logger: console,
}));

bot.on('message:text', ctx => ctx.reply('Observed.'));
```

The middleware emits `update.duration`, `api.duration`, and `error.count` metrics.

## Metrics

```typescript
bot.use(observability({
    onMetric(metric) {
        if (metric.type === 'update.duration') {
            histogram.observe(metric.durationMs, {
                ok: String(metric.ok),
                updateType: metric.updateType ?? 'unknown',
            });
        }
    },
}));
```

Metric types:

| Type | Meaning |
| --- | --- |
| `update.duration` | One middleware chain duration for a Telegram update |
| `api.duration` | One outgoing `ctx.client.callApi()` duration |
| `error.count` | One handler or API error counter event |

All metrics include safe metadata when available: `updateId`, `chatId`, `fromId`, and API `method`.

## Structured Logging

```typescript
import { observability, redactError } from '@vibegram/observability';

bot.use(observability({
    logger: {
        info(entry) {
            console.log(JSON.stringify(entry));
        },
        error(entry) {
            console.error(JSON.stringify(entry));
        },
    },
    redact: ['session', 'internalToken'],
}));
```

Logs are redacted before they reach the logger. Error logs contain name and message only, not stack traces.

## OpenTelemetry Hook

```typescript
bot.use(observability({
    openTelemetry: {
        recordMetric(metric) {
            meter.record(metric);
        },
    },
}));
```

The package does not import OpenTelemetry. Pass your own bridge so the plugin stays dependency-free.

## Sentry Hook

```typescript
bot.use(observability({
    sentry: {
        captureException(error, context) {
            Sentry.captureException(error, { extra: context });
        },
    },
}));
```

Sentry receives the original error plus redacted context. The bot still rethrows the original error after telemetry is recorded.

## Redaction

```typescript
import { redactValue, redactError } from '@vibegram/observability';

console.log(redactValue({
    token: process.env.TELEGRAM_BOT_TOKEN,
    authorization: 'Bearer secret',
    prompt: 'private prompt',
}));

console.error(redactError(new Error('failed token 123456:ABC')));
```

Default redacted keys include `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, and `prompt`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sink` | `MetricSink` | none | Object with `write(metric)` |
| `onMetric` | `(metric) => void` | none | Metric callback |
| `logger` | object | none | `info`, `warn`, `error`, or `log` methods |
| `openTelemetry` | object | none | Optional `recordMetric(metric)` hook |
| `sentry` | object | none | Optional `captureException(error, context)` hook |
| `redact` | `string[]` | sensitive defaults | Extra keys to redact |
| `replacement` | `string` | `[REDACTED]` | Redaction replacement |
| `maxDepth` | `number` | `12` | Redaction traversal depth |
| `clock` | `() => number` | `Date.now` | Duration clock for tests |
| `now` | `() => Date` | `new Date()` | Timestamp clock for tests |
| `failOnObserverError` | `boolean` | `false` | Throw when metric/logger hooks fail |

## Failure Modes

- Observer, logger, OpenTelemetry, and Sentry hook failures are ignored by default so telemetry does not break bot handling.
- Set `failOnObserverError: true` in tests if you need hook failures to fail fast.
- Handler and Telegram API errors are rethrown after telemetry is recorded.
- `ctx.client.callApi` is restored after the middleware finishes.

## Security Notes

Do not log raw production updates unless you have a privacy policy and retention window. Telegram updates can contain message text, usernames, locations, file IDs, and payment-related data.

Redaction is applied before logger and metric hooks, but downstream observability backends may still persist metadata. Keep labels low-cardinality and avoid storing raw user content in metrics.

## Validation

The package includes tests for update duration metrics, Telegram API duration metrics, redaction, error counters, observer isolation, API error behavior, and typed context flavor.

```bash
npm run plugins:validate
npm run docs:build
```
