# Redis Storage

`@vibegram/storage-redis` provides Redis-backed stores for VibeGram sessions, inbound rate limiting, and Codex conversation memory. It is designed for server deployments where in-memory state would disappear on restart or split across multiple bot processes.

## When to Use

Use Redis storage when:

- your bot runs in Docker, systemd, PM2, or more than one process
- sessions must survive deploys and restarts
- rate-limit counters must be shared between workers
- Codex conversation memory should survive process restarts

For small local experiments, the built-in memory stores are simpler.

## Install

When this official plugin package is published, install it from npm with your Redis client:

```bash
npm install vibegram @vibegram/storage-redis redis
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/storage-redis": "file:../vibegram/plugins/storage-redis",
    "redis": "^5.0.0"
  }
}
```

The plugin does not bundle Redis. Bring your own `redis`, `ioredis`, or compatible client.

## Minimal Server Setup

```typescript
import { createClient } from 'redis';
import { Bot, rateLimit, session } from 'vibegram';
import {
    RedisRateLimitStore,
    RedisSessionStore,
} from '@vibegram/storage-redis';

const token = process.env.TELEGRAM_BOT_TOKEN;
const redisUrl = process.env.REDIS_URL;

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!redisUrl) throw new Error('REDIS_URL is required');

const redis = createClient({ url: redisUrl });
await redis.connect();

const bot = new Bot(token);

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

process.once('SIGTERM', async () => {
    await redis.quit();
});

await bot.launch();
```

## Session Store

`RedisSessionStore` matches VibeGram's `SessionStore` shape:

```typescript
bot.use(session({
    store: new RedisSessionStore<MySession>(redis, {
        prefix: 'prod:session:',
        ttlMs: 7 * 24 * 60 * 60 * 1000,
    }),
    initial: () => ({ step: 'idle' }),
}));
```

Default prefix is `vibegram:session:`. Default TTL is 24 hours.

## Rate Limit Store

`RedisRateLimitStore` is used with the `rateLimit({ store })` option:

```typescript
bot.use(rateLimit({
    windowMs: 60_000,
    limit: 20,
    store: new RedisRateLimitStore(redis, {
        prefix: 'prod:rate:',
    }),
}));
```

The middleware provides the correct TTL per counter window. The store persists `{ count, resetTime }` as JSON and applies that TTL in Redis.

## Codex Memory Store

`RedisCodexMemoryStore` implements the Codex memory contract: `append`, `list`, and `clear`.

```typescript
import { codex, codexProvider } from '@vibegram/codex';
import { RedisCodexMemoryStore } from '@vibegram/storage-redis';

bot.use(codex({
    provider: codexProvider({
        authJsonPath: process.env.CODEX_AUTH_JSON_PATH,
    }),
    memoryStore: new RedisCodexMemoryStore(redis, {
        prefix: 'prod:codex:',
        maxHistory: 20,
        ttlMs: 30 * 24 * 60 * 60 * 1000,
    }),
}));
```

The memory store preserves message order and trims history with the same system-prompt preservation behavior as the in-memory Codex store.

## Options

Common options:

| Option | Default | Description |
| --- | --- | --- |
| `prefix` | store-specific | Redis key prefix. Use a unique prefix per bot/environment |
| `ttlMs` | store-specific | Expiration time in milliseconds |

`RedisCodexMemoryStore` also accepts:

| Option | Default | Description |
| --- | --- | --- |
| `maxHistory` | `20` | Maximum stored Codex messages per conversation key |

## Redis Client Contract

The client must implement:

| Command | Required For |
| --- | --- |
| `get` | Reading all stores |
| `set` | Writing stores without atomic TTL fallback |
| `del` or `unlink` | Clearing sessions, rate limits, and Codex memory |
| `pSetEx`, `psetex`, `pExpire`, `pexpire`, or `expire` | Any store that uses TTL |

The adapters call `pSetEx`/`psetex` first when available. Otherwise, they call `set` and then apply TTL through an expire command.

## Failure Modes

- Corrupt JSON throws `RedisStoreParseError`.
- Missing Redis keys return `undefined` for sessions/rate limits and `[]` for Codex memory.
- If a TTL is configured but the Redis client has no TTL command, writes throw a clear configuration error.
- The Codex memory store uses read-modify-write JSON arrays. For extremely high concurrency on the same conversation key, prefer serializing access at the application level.

## Security Notes

- Keep `REDIS_URL` in environment variables or a secret manager.
- Use TLS/authenticated Redis in production.
- Use unique prefixes per app and environment, for example `prod:bot-a:session:`.
- Do not store access tokens in session data unless you have a retention and rotation policy.

## Validation

The package includes tests for session persistence, TTL application, Codex memory ordering and trimming, clearing memory, and corrupt JSON handling.

```bash
npm run plugins:validate
npm run docs:build
```
