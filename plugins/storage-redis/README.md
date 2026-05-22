# @vibegram/storage-redis

Redis storage adapters for VibeGram sessions, inbound rate limits, and Codex conversation memory.

This package does not bundle a Redis client. Bring your own `redis`, `ioredis`, or compatible client that implements `get`, `set`, `del`, and a TTL command such as `pSetEx`, `psetex`, `pExpire`, `pexpire`, or `expire`.

## Install

```bash
npm install vibegram @vibegram/storage-redis redis
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/storage-redis": "file:../vibegram/plugins/storage-redis",
    "redis": "^5.0.0"
  }
}
```

## Usage

```typescript
import { createClient } from 'redis';
import { Bot, rateLimit, session } from 'vibegram';
import {
    RedisRateLimitStore,
    RedisSessionStore,
} from '@vibegram/storage-redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(session({
    store: new RedisSessionStore(redis, {
        prefix: 'mybot:session:',
        ttlMs: 7 * 24 * 60 * 60 * 1000,
    }),
}));

bot.use(rateLimit({
    store: new RedisRateLimitStore(redis, {
        prefix: 'mybot:rate:',
    }),
}));
```

## Codex Memory

```typescript
import { codex, codexProvider } from '@vibegram/codex';
import { RedisCodexMemoryStore } from '@vibegram/storage-redis';

bot.use(codex({
    provider: codexProvider({ authJsonPath: process.env.CODEX_AUTH_JSON_PATH }),
    memoryStore: new RedisCodexMemoryStore(redis, {
        prefix: 'mybot:codex:',
        maxHistory: 20,
        ttlMs: 30 * 24 * 60 * 60 * 1000,
    }),
}));
```

## Exports

| Export | Purpose |
| --- | --- |
| `RedisSessionStore` | Implements VibeGram's session store shape |
| `RedisRateLimitStore` | Implements VibeGram's rate-limit store shape |
| `RedisCodexMemoryStore` | Implements the Codex `append/list/clear` memory shape |
| `RedisStoreParseError` | Predictable error for corrupt JSON payloads |
| `RedisClientLike` | Minimal client contract used by the adapters |

## Validation

```bash
npm run typecheck
npm test
npm run build
```
