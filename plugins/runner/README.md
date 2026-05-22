# @vibegram/runner

Concurrent long polling runner for VibeGram bots.

Use this package when `bot.launch()` is too sequential for your polling workload and you need bounded concurrency, per-chat ordering, backpressure, graceful shutdown, and metrics-friendly lifecycle hooks.

## Install

```bash
npm install vibegram @vibegram/runner
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/runner": "file:../vibegram/plugins/runner"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { run } from '@vibegram/runner';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.on('message', ctx => ctx.reply('Handled concurrently.'));

const runner = run(bot, {
    concurrency: 32,
    orderedByChat: true,
    maxQueueSize: 1000,
    stopTimeoutMs: 30_000,
});

process.once('SIGINT', () => void runner.stop());
process.once('SIGTERM', () => void runner.stop());
```

Do not call `bot.launch()` and `run(bot)` for the same bot process. `run(bot)` owns long polling and dispatches updates through `bot.handleUpdate(update)`.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `concurrency` | `16` | Maximum number of updates handled at the same time |
| `orderedByChat` | `true` | Prevents updates from the same chat from running concurrently |
| `maxQueueSize` | `1000` | Maximum pending update queue size before polling backpressure waits |
| `stopTimeoutMs` | `30000` | Maximum time to wait for in-flight handlers during `stop()` |
| `retryDelayMs` | `3000` | Delay after polling failures before retrying `getUpdates` |
| `polling.offset` | none | Initial Telegram update offset |
| `polling.limit` | `100` | `getUpdates` batch size |
| `polling.timeout` | `30` | Long polling timeout in seconds |
| `polling.interval` | `0` | Delay between successful polling requests in milliseconds |
| `polling.allowed_updates` | none | Telegram allowed update type filter |
| `onStart` | none | Lifecycle hook called before polling starts |
| `onStop` | none | Lifecycle hook called after the queue drains |
| `onError` | none | Error hook for polling and handler failures |
| `onQueueFull` | none | Backpressure hook called while the pending queue is full |
| `onUpdateComplete` | none | Hook called after each update completes |

## Failure Modes

- Handler errors are isolated. The runner reports them through `onError` and continues processing later updates.
- Polling errors are reported through `onError`, then retried after `retryDelayMs`.
- `stop()` waits for active handlers. If they do not finish before `stopTimeoutMs`, it rejects with `RunnerStopTimeoutError`.
- The runner cannot abort an already-open Telegram `getUpdates` request. `stop()` still stops accepting new fetched updates and drains in-flight handlers.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
