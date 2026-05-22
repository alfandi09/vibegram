# Throttler

`@vibegram/throttler` queues and paces outgoing Telegram Bot API calls before they hit Telegram flood limits. It is a `TelegramClient` request transformer installed with `bot.client.use()`.

## When to Use

Use this plugin when your bot sends bursts of messages, edits, broadcasts, or callback answers and you want predictable outgoing flow control.

Throttling is proactive. It slows requests before Telegram returns `429`. For best resilience, combine it with `@vibegram/auto-retry`, which reacts to failures that still happen.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/throttler
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/throttler": "file:../vibegram/plugins/throttler"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { apiThrottler } from '@vibegram/throttler';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.client.use(apiThrottler());

bot.on('message', ctx => ctx.reply('This reply is throttled.'));

await bot.launch();
```

## Production Setup

Keep the throttler handle so shutdown can drain queued requests:

```typescript
const throttler = apiThrottler({
    global: { maxConcurrent: 30, minTime: 35 },
    group: { maxConcurrent: 1, minTime: 1000 },
    private: { maxConcurrent: 1, minTime: 1000 },
    methods: {
        answerCallbackQuery: { maxConcurrent: 10, minTime: 0, priority: 10 },
        sendInvoice: { maxConcurrent: 1, minTime: 1000, priority: 5 },
    },
    maxQueueSize: 5000,
    queueStrategy: 'reject',
});

bot.client.use(throttler);

process.once('SIGINT', () => void throttler.close());
process.once('SIGTERM', () => void throttler.close());
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `global` | `{ maxConcurrent: 30, minTime: 35 }` | Bucket applied to every request. Set `false` to disable |
| `group` | `{ maxConcurrent: 1, minTime: 1000 }` | Per negative `chat_id` bucket. Set `false` to disable |
| `private` | `{ maxConcurrent: 1, minTime: 1000 }` | Per non-negative `chat_id` bucket. Set `false` to disable |
| `out` | same as `private` | Alias for grammY-style private outgoing bucket naming |
| `methods` | none | Per-method bucket overrides and optional priority |
| `maxQueueSize` | `1000` | Maximum pending request count |
| `queueStrategy` | `reject` | `reject` or `drop-oldest` when the queue is full |
| `priority` | none | Dynamic priority function. Higher priority starts first |

Bucket fields:

| Field | Default | Description |
| --- | --- | --- |
| `maxConcurrent` | bucket-specific | Maximum active requests in the bucket |
| `minTime` | bucket-specific | Minimum milliseconds between request starts |
| `priority` | `0` | Static priority for method buckets |

## Priority

Queued jobs use higher priority first, then FIFO order for equal priority.

```typescript
bot.client.use(
    apiThrottler({
        methods: {
            answerCallbackQuery: { priority: 10 },
            sendMessage: { priority: 0 },
        },
    })
);
```

Use priority for urgent, cheap methods such as `answerCallbackQuery`. Do not use it to starve normal message traffic.

## Queue Limits

Default behavior rejects new requests when the pending queue is full:

```typescript
apiThrottler({
    maxQueueSize: 1000,
    queueStrategy: 'reject',
});
```

If stale queued requests are worse than rejecting the newest request, use `drop-oldest`:

```typescript
apiThrottler({
    maxQueueSize: 1000,
    queueStrategy: 'drop-oldest',
});
```

Both strategies throw `ThrottlerQueueOverflowError` for the rejected or dropped request.

## Handle

`apiThrottler()` returns a transformer with runtime controls:

```typescript
const throttler = apiThrottler();

bot.client.use(throttler);

await throttler.idle();
await throttler.close();
console.log(throttler.stats());
```

| Method | Description |
| --- | --- |
| `stats()` | Returns active, pending, processed, rejected, dropped, and closed counters |
| `idle()` | Resolves when active and pending requests are empty |
| `close()` | Stops accepting new requests and drains active/pending requests |

## Auto Retry Composition

Install throttling before auto retry if you want every retry attempt to go through the throttler too:

```typescript
bot.client.use(apiThrottler());
bot.client.use(autoRetry());
```

Because transformers wrap in registration order, this keeps both initial calls and retry attempts paced.

## Failure Modes

- A full queue rejects with `ThrottlerQueueOverflowError` by default.
- `drop-oldest` rejects the oldest queued request and accepts the new one.
- `close()` rejects new requests with `ThrottlerClosedError` and drains existing work.
- Requests without `chat_id` only use the global and method buckets.

## Security Notes

- The throttler does not inspect message text or file contents.
- Do not put secrets in method names or telemetry you attach around throttler stats.
- Use bounded queue sizes for public bots to avoid unbounded memory growth during spikes.

## Validation

The plugin is covered by tests for global throttling, per-chat throttling, priority, queue overflow, drop-oldest behavior, and graceful drain.

```bash
npm run plugins:validate
npm run docs:build
```
