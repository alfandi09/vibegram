# Logger

Built-in request logger middleware for debugging and observability.

## Quick Start

```typescript
import { Bot, logger } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(logger());
```

## Output Format

Each update logs:

```
[VibeGram] message from John (chat: 123456) — 3ms
[VibeGram] callback_query from Jane (chat: 789012) — 1ms
```

## Placement

Register the logger as the **first middleware** to capture timing for the entire pipeline:

```typescript
bot.use(logger());       // ← First
bot.use(rateLimit());
bot.use(session());
// handlers...
```
