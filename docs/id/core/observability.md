# Observability

VibeGram menyediakan lifecycle hooks ringan untuk tracing request, pelacakan error, dan telemetry operasional tanpa dependency tambahan.

## Bot Lifecycle Hooks

Gunakan bot observability hooks untuk instrumentasi polling, webhook handling, dan eksekusi update.

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!, {
    observability: {
        hooks: {
            onLaunch: ({ botInfo }) => {
                console.log(`Bot ${botInfo.username} aktif`);
            },
            onStop: ({ reason }) => {
                console.log(`Bot berhenti: ${reason ?? 'manual'}`);
            },
            onUpdateStart: ({ updateType }) => {
                console.log(`Mulai ${updateType}`);
            },
            onUpdateSuccess: ({ updateType, durationMs }) => {
                console.log(`${updateType} selesai dalam ${durationMs}ms`);
            },
            onUpdateError: ({ updateType, error, durationMs }) => {
                console.error(`${updateType} gagal setelah ${durationMs}ms`, error);
            },
            onPollingError: ({ error }) => {
                console.error('Polling gagal', error);
            },
            onWebhookError: ({ error, update }) => {
                console.error('Update webhook gagal', error, update);
            },
        },
    },
});
```

## Telegram Client Hooks

Gunakan client hooks untuk mengamati traffic Bot API keluar, retry, dan error.

```typescript
import { Bot, TelegramClient } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!, {
    observability: {
        client: {
            onRequestStart: ({ method, attempt }) => {
                console.log(`Memanggil ${method} (attempt ${attempt})`);
            },
            onRequestSuccess: ({ method, durationMs }) => {
                console.log(`${method} berhasil dalam ${durationMs}ms`);
            },
            onRateLimitRetry: ({ method, retryAfter, remainingRetries }) => {
                console.warn(
                    `${method} kena rate limit, retry dalam ${retryAfter}s (${remainingRetries} retry tersisa)`
                );
            },
            onRequestError: ({ method, statusCode, error }) => {
                console.error(`Telegram API ${method} gagal`, statusCode, error);
            },
        },
    },
});

const client = new TelegramClient(process.env.BOT_TOKEN!, {
    networkRetries: 2,
    hooks: {
        onNetworkRetry: ({ method, retryAfterMs, remainingRetries }) => {
            console.warn(
                `${method} gagal sementara, retry dalam ${retryAfterMs}ms (${remainingRetries} retry tersisa)`
            );
        },
    },
});
```

## Catatan

1. Hooks hanya untuk observasi. Jika hook melempar error, VibeGram mencatat error hook tersebut dan tetap melanjutkan proses.
2. Middleware bawaan `logger()` tetap berguna untuk trace yang mudah dibaca manusia; hooks lebih cocok untuk metrics, tracing, dan structured logging.
3. `rateLimit()` juga menyediakan `onLimitExceeded`, yang bisa dipakai sebagai sinyal throttling khusus.
4. Retry network bersifat opt-in di `TelegramClient` melalui `networkRetries`; default-nya `0` untuk menghindari duplikasi request Bot API non-idempotent.
