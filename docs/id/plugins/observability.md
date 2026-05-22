# Observability

`@vibegram/observability` menambahkan metrics aman, structured logging, dan telemetry hooks di sekitar handling update VibeGram dan outgoing request Telegram API.

Gunakan untuk bot production yang membutuhkan latency metrics, error counter, log tersanitasi, dan bridge ke OpenTelemetry atau Sentry tanpa membawa SDK tersebut sebagai dependency plugin.

## Mapping Resmi Telegram

Plugin ini merekam metadata dari object Telegram `Update` dan outgoing Bot API request yang dibuat lewat `ctx.client.callApi()`.

Plugin ini tidak mengubah behavior Telegram, tidak melakukan retry, dan tidak memanggil Telegram langsung. Error handler dan API tetap dilempar ulang setelah telemetry direkam.

Referensi: [Update](https://core.telegram.org/bots/api#update), [Making requests](https://core.telegram.org/bots/api#making-requests), [getUpdates](https://core.telegram.org/bots/api#getupdates), dan [setWebhook](https://core.telegram.org/bots/api#setwebhook).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/observability
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/observability": "file:../vibegram/plugins/observability"
  }
}
```

## Penggunaan Minimal

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

Tipe metric:

| Type | Arti |
| --- | --- |
| `update.duration` | Durasi middleware penuh untuk satu update |
| `api.duration` | Durasi satu outgoing request Telegram API |
| `error.count` | Event counter error handler atau API |

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

Log disanitasi sebelum masuk logger. Log error berisi name dan message saja, bukan stack trace.

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

Package ini tidak mengimpor OpenTelemetry. Berikan bridge dari app agar plugin tetap dependency-free.

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

Sentry menerima error asli plus context yang sudah disanitasi. Bot tetap melempar ulang error asli.

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

Key default yang di-redact mencakup `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, dan `prompt`.

## Options

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `sink` | `MetricSink` | none | Object dengan `write(metric)` |
| `onMetric` | `(metric) => void` | none | Callback metric |
| `logger` | object | none | Method `info`, `warn`, `error`, atau `log` |
| `openTelemetry` | object | none | Hook opsional `recordMetric(metric)` |
| `sentry` | object | none | Hook opsional `captureException(error, context)` |
| `redact` | `string[]` | default sensitif | Key tambahan untuk di-redact |
| `replacement` | `string` | `[REDACTED]` | Pengganti redaction |
| `maxDepth` | `number` | `12` | Kedalaman traversal redaction |
| `clock` | `() => number` | `Date.now` | Clock durasi untuk test |
| `now` | `() => Date` | `new Date()` | Clock timestamp untuk test |
| `failOnObserverError` | `boolean` | `false` | Throw saat telemetry hook gagal |

## API TypeScript

Export utama: `observability()`, `MemoryMetricSink`, `redactValue()`, `redactError()`, `ObservabilityMetric`, `MetricSink`, `ObservabilityLogger`, dan `ObservabilityFlavor`.

## Failure Mode

- Failure observer, logger, OpenTelemetry, dan Sentry diabaikan secara default.
- Set `failOnObserverError: true` untuk fail-fast testing.
- Error handler dan Telegram API dilempar ulang setelah telemetry direkam.
- `ctx.client.callApi` dipulihkan setelah middleware selesai.

## Catatan Keamanan

Hindari logging raw production updates kecuali kamu punya retention policy. Metrics sebaiknya memakai label low-cardinality dan tidak menyertakan raw message text, prompt, token, atau authorization header.

## Validasi

Plugin ini punya test untuk update duration metrics, Telegram API duration metrics, redaction, error counter, observer isolation, API error behavior, dan typed context flavor.

```bash
npm run plugins:validate
npm run docs:build
```
