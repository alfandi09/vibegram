/**
 * VibeGram — Redis Session Adapter Example
 *
 * Demonstrates how to swap the built-in MemorySessionStore for a Redis-backed
 * store using the `ioredis` package. This enables persistent sessions that
 * survive bot restarts and work across multiple bot instances (horizontal scaling).
 *
 * Prerequisites:
 *   npm install ioredis
 *   npm install --save-dev @types/ioredis
 *
 * Usage:
 *   import { createRedisStore } from './redis-session';
 *   bot.use(session({ store: createRedisStore(redis, { ttlSeconds: 86400 }) }));
 */

// import Redis from 'ioredis';
// import type { SessionStore } from 'vibegram';

/**
 * Options for the Redis session store adapter.
 */
export interface RedisStoreOptions {
    /**
     * Key prefix for all session entries. Default: 'vibegram:session:'.
     * Useful for namespacing when sharing a Redis instance between services.
     */
    prefix?: string;
    /**
     * Time-to-live in seconds. Default: 86400 (24 hours).
     * Each session access resets the TTL.
     */
    ttlSeconds?: number;
}

/**
 * Creates a Redis-backed SessionStore compatible with VibeGram's session() middleware.
 *
 * @example
 * import Redis from 'ioredis';
 * import { Bot, session } from 'vibegram';
 * import { createRedisStore } from './redis-session';
 *
 * const redis = new Redis({ host: 'localhost', port: 6379 });
 * const bot = new Bot(process.env.BOT_TOKEN!);
 *
 * bot.use(session({
 *     store: createRedisStore(redis),
 *     initial: () => ({ count: 0, language: 'en' }),
 * }));
 *
 * bot.command('count', async (ctx) => {
 *     ctx.session.count++;
 *     await ctx.reply(`You have sent ${ctx.session.count} messages.`);
 * });
 *
 * bot.launch();
 */
export function createRedisStore(
    redis: any, // ioredis.Redis | ioredis.Cluster
    options: RedisStoreOptions = {}
) /* : SessionStore */ {
    const prefix = options.prefix ?? 'vibegram:session:';
    const ttl = options.ttlSeconds ?? 86400;

    return {
        async get(key: string) {
            const raw = await redis.get(`${prefix}${key}`);
            if (!raw) return undefined;
            try {
                return JSON.parse(raw);
            } catch {
                return undefined;
            }
        },

        async set(key: string, value: any) {
            const serialized = JSON.stringify(value);
            // EX resets TTL on every write (sliding window expiry).
            await redis.set(`${prefix}${key}`, serialized, 'EX', ttl);
        },

        async delete(key: string) {
            await redis.del(`${prefix}${key}`);
        },
    };
}

// ---------------------------------------------------------------------------
// Full runnable example (uncomment to use)
// ---------------------------------------------------------------------------

/*
import Redis from 'ioredis';
import { Bot, session } from 'vibegram';

interface MySession {
    count: number;
    language: string;
    lastCommand?: string;
}

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    // For production: enable TLS
    // tls: {},
});

const bot = new Bot<{ session: MySession }>(process.env.BOT_TOKEN!);

bot.use(session<MySession>({
    store: createRedisStore(redis, { ttlSeconds: 7 * 24 * 3600 }), // 7 days
    initial: () => ({ count: 0, language: 'en' }),
}));

bot.command('start', async (ctx) => {
    ctx.session.count = 0;
    await ctx.reply('Session reset. Counter is at 0.');
});

bot.command('count', async (ctx) => {
    ctx.session.count++;
    ctx.session.lastCommand = 'count';
    await ctx.reply(`Message count: ${ctx.session.count}`);
});

bot.launch().then(() => console.log('Bot with Redis sessions running!'));
*/
