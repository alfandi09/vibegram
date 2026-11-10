# API Caching

Some Telegram calls return data that rarely changes: chat info, the bot's own profile, a
sticker set. If your handlers ask for the same thing on every update, `apiCache()`
remembers the answer for a while and skips the network round trip.

## Quick Start

```typescript
import { Bot, apiCache } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(apiCache({ ttl: 300 })); // remember answers for 5 minutes

bot.command('info', async ctx => {
    const chat = await ctx.getChat(); // first call in 5 minutes: asks Telegram
    await ctx.reply(`Chat: ${chat.title ?? chat.first_name}`);
});
// The next /info in the same chat within 5 minutes gets the stored answer.
```

Register it with `bot.use()` **before** the handlers that should benefit. It caches
calls made through `ctx` (such as `ctx.getChat()` or `ctx.client.callApi('getMe')`) in
handlers that run after it. The cache itself is shared across all updates and users.

## What Gets Cached

Only read-only methods. Everything else, such as sending, editing, or deleting, always
goes to Telegram.

| Method | Returns |
| --- | --- |
| `getChat` | Chat information |
| `getChatMember` | A member's status (admin, member, banned, ...) |
| `getChatMemberCount` | Number of members |
| `getChatAdministrators` | Admin list |
| `getFile` | File path for downloading |
| `getMe` | The bot's own profile |
| `getMyCommands` | The bot's command list |
| `getStickerSet`, `getCustomEmojiStickers` | Sticker data |
| `getUserProfilePhotos` | A user's profile photos |
| `getGameHighScores` | Game scores |
| `getForumTopicIconStickers` | Forum topic icons |

The key is the method name plus its parameters, so `getChat` for two different chats is
stored separately.

::: warning Cached data can be out of date
Within the TTL, a cached answer does not reflect changes. The most important case is
`getChatMember`, which [`isAdmin()`](/core/filters) uses: someone who was just demoted
can still pass an admin check until the entry expires. Keep the TTL short (for example
`ttl: 30`) if you rely on admin checks, or register `apiCache()` after them.
:::

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ttl` | `number` | `300` | How long to keep an answer, in **seconds** |
| `store` | `CacheStore` | `new MemoryCache()` | Where answers are stored |
| `keyGenerator` | `(method, params) => string` | method + JSON of params | Builds the cache key |

## Memory Limit

The built-in `MemoryCache` keeps at most 10 000 entries. When it is full, the entry that
was used least recently is removed first. Pass a different limit if you need one:

```typescript
import { apiCache, MemoryCache } from 'vibegram';

bot.use(apiCache({ store: new MemoryCache(5000) }));
```

## Sharing a Cache Between Instances (Redis)

`MemoryCache` lives inside one process. With several bot instances, or to keep the
cache across restarts, implement `CacheStore` on top of Redis or another store:

```typescript
import type { CacheStore } from 'vibegram';

const PREFIX = 'vibegram:cache:';

class RedisCache implements CacheStore {
    async get(key: string) {
        const data = await redis.get(PREFIX + key);
        return data ? JSON.parse(data) : undefined;
    }
    async set(key: string, value: unknown, ttlMs: number) {
        await redis.set(PREFIX + key, JSON.stringify(value), { PX: ttlMs });
    }
    async delete(key: string) {
        await redis.del(PREFIX + key);
    }
    async clear() {
        // Delete only this cache's keys, not the whole Redis database.
        for await (const key of redis.scanIterator({ MATCH: PREFIX + '*' })) {
            await redis.del(key);
        }
    }
}

bot.use(apiCache({ ttl: 600, store: new RedisCache() }));
```

`redis` stands for a [node-redis](https://github.com/redis/node-redis) client; adjust
the calls if you use another client.

## Caching Your Own Functions

`cached()` wraps any async function, for example a database lookup, with the same TTL
logic. The arguments form the key:

```typescript
import { cached } from 'vibegram';

const findUser = cached(async (userId: number) => db.users.findById(userId), { ttl: 60 });

const user = await findUser(123); // queries the database
const again = await findUser(123); // within 60 seconds: stored result
```

`undefined` results are not cached, so a lookup that found nothing is retried on the
next call.
