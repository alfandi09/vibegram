# Redis Storage

`@vibegram/storage-redis` menyediakan store berbasis Redis untuk session VibeGram, inbound rate limit, dan memory percakapan Codex. Plugin ini ditujukan untuk deployment server ketika state in-memory akan hilang saat restart atau terpisah di beberapa proses bot.

## Kapan Dipakai

Gunakan Redis storage saat:

- bot berjalan di Docker, systemd, PM2, atau lebih dari satu proses
- session harus tetap ada setelah deploy dan restart
- counter rate-limit harus dibagi antar worker
- memory percakapan Codex harus tetap ada setelah process restart

Untuk eksperimen lokal kecil, store memory bawaan lebih sederhana.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm bersama Redis client:

```bash
npm install vibegram @vibegram/storage-redis redis
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/storage-redis": "file:../vibegram/plugins/storage-redis",
    "redis": "^5.0.0"
  }
}
```

Plugin ini tidak membawa Redis client sendiri. Gunakan `redis`, `ioredis`, atau client kompatibel.

## Setup Server Minimal

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

`RedisSessionStore` cocok dengan shape `SessionStore` milik VibeGram:

```typescript
bot.use(session({
    store: new RedisSessionStore<MySession>(redis, {
        prefix: 'prod:session:',
        ttlMs: 7 * 24 * 60 * 60 * 1000,
    }),
    initial: () => ({ step: 'idle' }),
}));
```

Prefix default adalah `vibegram:session:`. TTL default adalah 24 jam.

## Rate Limit Store

`RedisRateLimitStore` dipakai melalui opsi `rateLimit({ store })`:

```typescript
bot.use(rateLimit({
    windowMs: 60_000,
    limit: 20,
    store: new RedisRateLimitStore(redis, {
        prefix: 'prod:rate:',
    }),
}));
```

Middleware menyediakan TTL yang tepat untuk setiap counter window. Store menyimpan `{ count, resetTime }` sebagai JSON dan menerapkan TTL itu di Redis.

## Codex Memory Store

`RedisCodexMemoryStore` mengimplementasikan kontrak memory Codex: `append`, `list`, dan `clear`.

```typescript
import { codex, codexProvider } from 'vibegram/codex';
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

Memory store menjaga urutan message dan melakukan trim history dengan perilaku preservasi system prompt seperti store Codex in-memory.

## Options

Opsi umum:

| Option | Default | Deskripsi |
| --- | --- | --- |
| `prefix` | sesuai store | Prefix key Redis. Gunakan prefix unik per bot/environment |
| `ttlMs` | sesuai store | Waktu kedaluwarsa dalam milidetik |

`RedisCodexMemoryStore` juga menerima:

| Option | Default | Deskripsi |
| --- | --- | --- |
| `maxHistory` | `20` | Maksimum message Codex yang disimpan per conversation key |

## Kontrak Redis Client

Client harus mengimplementasikan:

| Command | Dibutuhkan Untuk |
| --- | --- |
| `get` | Membaca semua store |
| `set` | Menulis store tanpa fallback TTL atomik |
| `del` atau `unlink` | Menghapus session, rate limit, dan memory Codex |
| `pSetEx`, `psetex`, `pExpire`, `pexpire`, atau `expire` | Store yang memakai TTL |

Adapter memanggil `pSetEx`/`psetex` terlebih dahulu jika tersedia. Jika tidak, adapter memanggil `set` lalu menerapkan TTL melalui command expire.

## Failure Modes

- JSON corrupt melempar `RedisStoreParseError`.
- Key Redis yang tidak ada mengembalikan `undefined` untuk session/rate limit dan `[]` untuk Codex memory.
- Jika TTL dikonfigurasi tetapi Redis client tidak punya command TTL, write akan melempar error konfigurasi yang jelas.
- Store Codex memory memakai array JSON read-modify-write. Untuk concurrency sangat tinggi pada conversation key yang sama, serialkan akses di level aplikasi.

## Catatan Keamanan

- Simpan `REDIS_URL` di environment variable atau secret manager.
- Gunakan Redis dengan TLS/auth di production.
- Gunakan prefix unik per app dan environment, misalnya `prod:bot-a:session:`.
- Jangan menyimpan access token di session data kecuali ada kebijakan retensi dan rotasi.

## Validasi

Package ini punya test untuk persistensi session, penerapan TTL, ordering dan trimming memory Codex, clear memory, serta corrupt JSON handling.

```bash
npm run plugins:validate
npm run docs:build
```
