# Runner

`@vibegram/runner` runs VibeGram long polling with bounded concurrency. Use it for polling bots that receive enough traffic that sequential `bot.launch()` processing becomes a bottleneck.

## When to Use

Use `@vibegram/runner` when your bot is deployed with long polling and needs:

- concurrent update handling
- predictable per-chat ordering
- backpressure when the handler queue is full
- graceful shutdown with in-flight handler drain
- metrics and lifecycle hooks

For small bots, `bot.launch()` is still the simplest option. Do not run both for the same bot process.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/runner
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/runner": "file:../vibegram/plugins/runner"
  }
}
```

Build the repository first if you are testing it locally:

```bash
cd vibegram
npm install
npm run build
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { run } from '@vibegram/runner';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.on('message', ctx => ctx.reply('Handled concurrently.'));

const runner = run(bot);

process.once('SIGINT', () => void runner.stop());
process.once('SIGTERM', () => void runner.stop());
```

`run(bot)` starts polling immediately and returns a runner handle.

## Production Setup

Tune the runner from measured traffic, not guesswork. Start with moderate concurrency and increase it only when update processing is CPU-light and mostly waiting on I/O.

```typescript
const runner = run(bot, {
    concurrency: Number(process.env.RUNNER_CONCURRENCY ?? 32),
    orderedByChat: true,
    maxQueueSize: Number(process.env.RUNNER_MAX_QUEUE_SIZE ?? 1000),
    stopTimeoutMs: 30_000,
    retryDelayMs: 3000,
    polling: {
        limit: 100,
        timeout: 30,
        allowed_updates: ['message', 'callback_query'],
    },
    onError(event) {
        console.error('[runner:error]', {
            phase: event.phase,
            updateId: event.update?.update_id,
            error: event.error instanceof Error ? event.error.message : String(event.error),
            active: event.stats.active,
            pending: event.stats.pending,
        });
    },
    onUpdateComplete(event) {
        console.log('[runner:update]', {
            updateId: event.update.update_id,
            durationMs: event.durationMs,
            active: event.stats.active,
            pending: event.stats.pending,
        });
    },
});
```

## Comparison with `bot.launch()`

| Feature | `bot.launch()` | `@vibegram/runner` |
| --- | --- | --- |
| Long polling | yes | yes |
| Concurrent update handling | no | yes |
| Per-chat ordering | sequential globally | optional, enabled by default |
| Backpressure | implicit sequential processing | explicit pending queue limit |
| Graceful stop | yes | yes, with stop timeout |
| Metrics hooks | core observability hooks | runner-specific queue and update hooks |

`bot.launch()` is intentionally boring and sequential. `@vibegram/runner` is for higher-throughput polling processes.

## Per-Chat Ordering

Concurrent handlers can introduce race conditions if two updates from the same chat mutate shared state at the same time. `orderedByChat` keeps updates from one chat sequential while still allowing different chats to run concurrently.

```typescript
run(bot, {
    concurrency: 32,
    orderedByChat: true,
});
```

Disable it only when your handlers are stateless or your storage layer already handles conflicts safely.

## Backpressure

`maxQueueSize` limits pending updates waiting for handler capacity. When the queue is full, the runner waits before accepting more updates from the current polling batch.

```typescript
run(bot, {
    concurrency: 16,
    maxQueueSize: 500,
    onQueueFull(event) {
        console.warn('[runner:queue-full]', {
            pending: event.pending,
            active: event.active,
            capacity: event.capacity,
        });
    },
});
```

If this hook fires repeatedly, reduce update work, increase capacity carefully, or move slow side effects to a queue.

## Runner Handle

```typescript
const runner = run(bot);

runner.stats();
await runner.idle();
await runner.stop();
await runner.done();
```

| Method | Description |
| --- | --- |
| `stats()` | Returns received, processed, failed, active, pending, offset, and state counters |
| `idle()` | Resolves when the current queue and active handlers are empty |
| `stop()` | Stops accepting new fetched updates and waits for active handlers |
| `done()` | Resolves when the polling loop exits |

## Failure Modes

Handler errors do not stop the runner. They are reported through `onError` with `phase: 'handleUpdate'`.

Polling failures are reported with `phase: 'polling'` and retried after `retryDelayMs`.

`stop()` can reject with `RunnerStopTimeoutError` when a handler never finishes before `stopTimeoutMs`. Keep handlers bounded with timeouts when they call slow external systems.

## Security Notes

- Never log bot tokens or raw Telegram request headers in runner hooks.
- Keep hook logs metadata-only unless you have a deliberate privacy policy for message content.
- For private bots, combine the runner with allowlist or rate-limit middleware before expensive handlers.

## Validation

The plugin is covered by tests for concurrency, per-chat ordering, handler error isolation, graceful stop, and queue backpressure.

```bash
npm run plugins:validate
npm run docs:build
```
