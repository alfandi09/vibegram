# @vibegram/devtools

Debug, replay, and sanitized telemetry helpers for VibeGram bots.

Use this package to capture Telegram update snapshots, record middleware timings, log outgoing Telegram API calls, and replay captured updates locally.

## Install

```bash
npm install vibegram @vibegram/devtools
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/devtools": "file:../vibegram/plugins/devtools"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { devtools } from '@vibegram/devtools';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(devtools({
    capture: process.env.NODE_ENV !== 'production',
    jsonlPath: '.vibegram/events.jsonl',
    redact: ['session', 'authorization'],
}));

await bot.launch();
```

## Exports

| Export | Purpose |
| --- | --- |
| `devtools(options?)` | Middleware for update snapshots, API logs, and timing events |
| `withDevtoolsTiming(name, middleware)` | Wrap middleware in a named timing span |
| `MemoryDevtoolsSink` | In-memory event sink for tests |
| `createJsonlSink(filePath)` | Append events as JSONL |
| `createConsoleSink(logger?)` | Write JSON events to `console.log` |
| `createReplayFixture(update, options?)` | Create a sanitized replay fixture |
| `replayUpdates(target, updates, options?)` | Replay updates into a handler or bot-like object |
| `readJsonlReplay(filePath)` | Load update events from JSONL |
| `replayJsonl(target, filePath, options?)` | Replay update events from JSONL |
| `sanitizeValue(value, options?)` | Deep sanitizer with key redaction |

## Production Defaults

If `capture` is omitted, devtools captures outside production and does nothing when `NODE_ENV=production`.

Set `capture: true` only when you intentionally want production capture, and always keep redaction enabled.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
