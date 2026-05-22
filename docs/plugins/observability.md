# Observability

`@vibegram/observability` adds safe metrics, structured logging, and telemetry hooks around VibeGram update handling and outgoing Telegram API requests.

Use it for production bots that need latency metrics, error counters, redacted logs, and bridge hooks for OpenTelemetry or Sentry without pulling those SDKs into the plugin itself.

## Official Telegram Mapping

The plugin records metadata around Telegram `Update` objects and outgoing Bot API requests made through `ctx.client.callApi()`.

It does not change Telegram behavior, does not retry requests, and does not call Telegram directly. Handler and API errors are rethrown after telemetry is recorded.

References: [Update](https://core.telegram.org/bots/api#update), [Making requests](https://core.telegram.org/bots/api#making-requests), [getUpdates](https://core.telegram.org/bots/api#getupdates), and [setWebhook](https://core.telegram.org/bots/api#setwebhook).

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
```

Metric types:

| Type | Meaning |
| --- | --- |
| `update.duration` | Full middleware duration for one update |
| `api.duration` | One outgoing Telegram API request duration |
| `error.count` | Handler or API error counter event |

## Logging

```typescript
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

Logs are redacted before they reach the logger. Error logs include name and message only, not stack traces.

## OpenTelemetry

```typescript
bot.use(observability({
    openTelemetry: {
        recordMetric(metric) {
            meter.record(metric);
        },
    },
}));
```

The package does not import OpenTelemetry. Pass a bridge from your app so the plugin remains dependency-free.

## Sentry

```typescript
bot.use(observability({
    sentry: {
        captureException(error, context) {
            Sentry.captureException(error, { extra: context });
        },
    },
}));
```

Sentry receives the original error plus redacted context. The bot still rethrows the original error.

## Redaction

```typescript
import { redactValue, redactError } from '@vibegram/observability';

redactValue({
    token: process.env.TELEGRAM_BOT_TOKEN,
    authorization: 'Bearer secret',
    prompt: 'private prompt',
});

redactError(new Error('failed token 123456:ABC'));
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
| `failOnObserverError` | `boolean` | `false` | Throw when telemetry hooks fail |

## TypeScript API

Exports include `observability()`, `MemoryMetricSink`, `redactValue()`, `redactError()`, `ObservabilityMetric`, `MetricSink`, `ObservabilityLogger`, and `ObservabilityFlavor`.

## Failure Modes

- Observer, logger, OpenTelemetry, and Sentry failures are ignored by default.
- Set `failOnObserverError: true` for fail-fast testing.
- Handler and Telegram API errors are rethrown after telemetry is recorded.
- `ctx.client.callApi` is restored after middleware completion.

## Security Notes

Avoid logging raw production updates unless you have a retention policy. Metrics should use low-cardinality labels and should not include raw message text, prompts, tokens, or authorization headers.

## Validation

The plugin is covered by tests for update duration metrics, Telegram API duration metrics, redaction, error counters, observer isolation, API error behavior, and typed context flavor.

```bash
npm run plugins:validate
npm run docs:build
```
