# Logger

Built-in request logger middleware for debugging and observability.

The logger is designed to be safe by default for common secrets:

- control characters are stripped
- long content is truncated
- Telegram bot tokens and JWT-like strings are redacted automatically

## Quick Start

```typescript
import { Bot, logger } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(logger());
```

## Safer Production Configuration

```typescript
bot.use(
    logger({
        redactContent: true,
        maxContentLength: 80,
    })
);
```

Use `redactContent: true` when callbacks or messages may contain customer data,
session references, signed tokens, or internal identifiers.

## Options

| Option | Type | Description |
| --- | --- | --- |
| `printer` | `(message: string) => void` | Send output to your own logger, such as Pino or Winston |
| `timeFormatter` | `() => string` | Custom timestamp formatter |
| `redactContent` | `boolean` | Replace message text and callback data with placeholders |
| `maxContentLength` | `number` | Truncate user-controlled content after this many characters |
| `redactPatterns` | `RegExp[]` | Additional patterns to scrub before logging |

## Output Format

Each update logs:

```text
[VibeGram] message from John (chat: 123456) - 3ms
[VibeGram] callback_query from Jane (chat: 789012) - 1ms
```

## Placement

Register the logger as the first middleware to capture timing for the entire
pipeline:

```typescript
bot.use(logger());
bot.use(rateLimit());
bot.use(session());
// handlers...
```

## Security Notes

1. Do not log full callback payloads if they contain signed state or internal IDs.
2. Prefer `redactContent: true` in production support bots and admin bots.
3. If you forward logs to a central platform, treat them as sensitive operational data.

## Performance Debugging

If processing time is consistently high, consider:

- adding `apiCache()` to reduce repeated Telegram API calls
- optimizing database queries in handlers
- using Redis or another external store for production sessions
