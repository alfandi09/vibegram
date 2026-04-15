import { Context } from './context';
import { Middleware } from './composer';

/**
 * Cache store interface for pluggable storage backends.
 */
export interface CacheStore {
    get(key: string): Promise<any | undefined>;
    set(key: string, value: any, ttlMs: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

/**
 * In-memory cache store with TTL expiration.
 */
export class MemoryCache implements CacheStore {
    private data = new Map<string, { value: any; expiresAt: number }>();
    private maxEntries: number;

    constructor(maxEntries: number = 10000) {
        this.maxEntries = maxEntries;
    }

    async get(key: string): Promise<any | undefined> {
        const entry = this.data.get(key);
        if (!entry) return undefined;

        if (Date.now() > entry.expiresAt) {
            this.data.delete(key);
            return undefined;
        }

        return entry.value;
    }

    async set(key: string, value: any, ttlMs: number): Promise<void> {
        // LRU eviction when at capacity
        if (this.data.size >= this.maxEntries && !this.data.has(key)) {
            const firstKey = this.data.keys().next().value;
            if (firstKey) this.data.delete(firstKey);
        }

        this.data.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    async delete(key: string): Promise<void> {
        this.data.delete(key);
    }

    async clear(): Promise<void> {
        this.data.clear();
    }

    /** Get current cache size */
    get size(): number {
        return this.data.size;
    }
}

export interface CacheOptions {
    /** Time-to-live in seconds (default: 300 = 5 minutes) */
    ttl?: number;
    /** Cache store implementation (default: MemoryCache) */
    store?: CacheStore;
    /** Custom key generator (default: method + JSON.stringify(params)) */
    keyGenerator?: (method: string, params: any) => string;
}

/**
 * Creates a caching wrapper around the bot's callApi method.
 * Caches GET-like API responses (getChat, getChatMember, getFile, etc.)
 *
 * Usage:
 * ```typescript
 * bot.use(apiCache({ ttl: 300 }));
 *
 * // Subsequent calls within TTL return cached data
 * const chat = await ctx.getChat(); // hits API
 * const chat2 = await ctx.getChat(); // returns cached
 * ```
 */
export function apiCache(options?: CacheOptions): Middleware<any> {
    const store = options?.store || new MemoryCache();
    const ttlMs = (options?.ttl ?? 300) * 1000;
    const keyGen =
        options?.keyGenerator ||
        ((method: string, params: any) => {
            return `${method}:${JSON.stringify(params || {})}`;
        });

    // Cacheable API methods (read-only, idempotent)
    const cacheableMethods = new Set([
        'getChat',
        'getChatMember',
        'getChatMemberCount',
        'getChatAdministrators',
        'getFile',
        'getMe',
        'getMyCommands',
        'getStickerSet',
        'getCustomEmojiStickers',
        'getUserProfilePhotos',
        'getGameHighScores',
        'getForumTopicIconStickers',
    ]);

    return async (ctx, next) => {
        // Intercept the client's callApi to add caching
        const originalCallApi = ctx.client.callApi.bind(ctx.client);

        ctx.client.callApi = async (method: string, params?: any) => {
            if (!cacheableMethods.has(method)) {
                return originalCallApi(method, params);
            }

            const key = keyGen(method, params);
            const cached = await store.get(key);
            if (cached !== undefined) {
                return cached;
            }

            const result = await originalCallApi(method, params);
            await store.set(key, result, ttlMs);
            return result;
        };

        try {
            await next();
        } finally {
            // Restore original to prevent leaking across updates
            ctx.client.callApi = originalCallApi;
        }
    };
}

/**
 * Standalone function to wrap any async function with caching.
 *
 * Usage:
 * ```typescript
 * const cachedFetch = cached(fetchUserData, { ttl: 60 });
 * const data = await cachedFetch(userId);
 * ```
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: { ttl?: number; store?: CacheStore }
): T {
    const store = options?.store || new MemoryCache();
    const ttlMs = (options?.ttl ?? 300) * 1000;

    return (async (...args: any[]) => {
        const key = JSON.stringify(args);
        const existing = await store.get(key);
        if (existing !== undefined) return existing;

        const result = await fn(...args);
        await store.set(key, result, ttlMs);
        return result;
    }) as T;
}
