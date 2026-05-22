# @vibegram/throttler

Outgoing Telegram API throttler for VibeGram bots.

Use this package to queue and pace Bot API calls before Telegram rejects them with flood-limit errors. It is designed to work with `TelegramClient.use()` and can be composed with `@vibegram/auto-retry`.

## Install

```bash
npm install vibegram @vibegram/throttler
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/throttler": "file:../vibegram/plugins/throttler"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { apiThrottler } from '@vibegram/throttler';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

const throttler = apiThrottler({
    global: { maxConcurrent: 30, minTime: 35 },
    group: { maxConcurrent: 1, minTime: 1000 },
    private: { maxConcurrent: 1, minTime: 1000 },
});

bot.client.use(throttler);

process.once('SIGTERM', () => void throttler.close());
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `global` | `{ maxConcurrent: 30, minTime: 35 }` | Bucket applied to every request. Use `false` to disable |
| `group` | `{ maxConcurrent: 1, minTime: 1000 }` | Per negative `chat_id` bucket. Use `false` to disable |
| `private` | `{ maxConcurrent: 1, minTime: 1000 }` | Per non-negative `chat_id` bucket. Use `false` to disable |
| `out` | same as `private` | Alias for grammY-style private outgoing bucket naming |
| `methods` | none | Per-method bucket overrides and priority |
| `maxQueueSize` | `1000` | Maximum pending request count |
| `queueStrategy` | `reject` | `reject` or `drop-oldest` when the queue is full |
| `priority` | none | Dynamic priority function. Higher priority starts first |

## Handle

`apiThrottler()` returns a transformer with runtime controls:

```typescript
const throttler = apiThrottler();

bot.client.use(throttler);

await throttler.idle();
await throttler.close();
throttler.stats();
```

`close()` stops accepting new requests and waits for active and queued requests to drain.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
