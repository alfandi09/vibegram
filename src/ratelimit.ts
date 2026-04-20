import { Context } from './context';
import { Middleware } from './composer';
import { definePlugin } from './plugin';

export interface RateLimitOptions {
    /**
     * Time window length in milliseconds.
     * Defaults to 1000ms for private chats and 60000ms for groups,
     * aligned with Telegram's official rate limit boundaries.
     */
    windowMs?: number;
    /**
     * Maximum number of requests allowed per window (burst threshold).
     * Defaults to 1 req/sec for private chats and 20 req/min for groups.
     */
    limit?: number;
    /** Custom key generator for per-user tracking. Default: `${chatId}_${fromId}` */
    keyGenerator?: (ctx: Context) => string | undefined;
    /** Callback invoked when a request exceeds the rate limit. */
    onLimitExceeded?: (ctx: Context, next: () => Promise<void>) => void | Promise<void>;
    /** Custom backing store. Defaults to an in-memory store. */
    store?: RateLimitStore;
    /** Cleanup interval for expiring rate-limit records. Defaults to 60000ms. */
    cleanupIntervalMs?: number;
}

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

export interface RateLimitStore {
    get(key: string): RateLimitRecord | undefined;
    set(key: string, value: RateLimitRecord): void;
    delete(key: string): void;
    entries(): IterableIterator<[string, RateLimitRecord]>;
    clear(): void;
}

export class MemoryRateLimitStore implements RateLimitStore {
    private readonly store = new Map<string, RateLimitRecord>();

    get(key: string): RateLimitRecord | undefined {
        return this.store.get(key);
    }

    set(key: string, value: RateLimitRecord): void {
        this.store.set(key, value);
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    entries(): IterableIterator<[string, RateLimitRecord]> {
        return this.store.entries();
    }

    clear(): void {
        this.store.clear();
    }
}

function cleanupExpiredRateLimits(store: RateLimitStore): void {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (now > record.resetTime) {
            store.delete(key);
        }
    }
}

function startRateLimitCleaner(
    store: RateLimitStore,
    cleanupIntervalMs: number = 60000
): ReturnType<typeof setInterval> {
    const cleaner = setInterval(() => {
        cleanupExpiredRateLimits(store);
    }, cleanupIntervalMs);
    cleaner.unref();
    return cleaner;
}

function createRateLimitMiddleware(
    options: RateLimitOptions | undefined,
    store: RateLimitStore
): Middleware<any> {
    return async (ctx: Context, next: () => Promise<void>) => {
        const keyGen =
            options?.keyGenerator ||
            ((c: Context) => {
                const chatId = c.chat?.id;
                const fromId = c.from?.id;
                if (!chatId || !fromId) return undefined;
                return `${chatId}_${fromId}`;
            });

        const key = keyGen(ctx);
        if (!key) return next();

        const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
        const defaultWindow = isGroup ? 60000 : 1000;
        const defaultLimit = isGroup ? 20 : 1;

        const windowMsDuration = options?.windowMs ?? defaultWindow;
        const limitCount = options?.limit ?? defaultLimit;

        const now = Date.now();
        let record = store.get(key);

        if (!record || now > record.resetTime) {
            record = {
                count: 1,
                resetTime: now + windowMsDuration,
            };
            store.set(key, record);
            return next();
        }

        record.count++;

        if (record.count > limitCount) {
            if (options?.onLimitExceeded) {
                return options.onLimitExceeded(ctx, next);
            }
            console.warn(`[Rate Limiter] Throttling request from ${key}.`);
            return;
        }

        return next();
    };
}

/**
 * Inbound rate limiter middleware.
 * Mirrors Telegram's native rate limit thresholds to protect against request flooding.
 */
export function rateLimit(options?: RateLimitOptions): Middleware<any> {
    const store = options?.store ?? new MemoryRateLimitStore();
    startRateLimitCleaner(store, options?.cleanupIntervalMs);
    return createRateLimitMiddleware(options, store);
}

/**
 * Plugin wrapper for `rateLimit()`.
 * Exposes the resolved store as a shared service and manages the cleaner
 * through plugin lifecycle hooks.
 */
export const rateLimitPlugin = definePlugin<Context, RateLimitOptions>({
    name: 'rate-limit',
    install(ctx) {
        const store = ctx.options.store ?? new MemoryRateLimitStore();
        ctx.provide('rate-limit-store', store);
        ctx.bot.use(
            createRateLimitMiddleware(
                {
                    ...ctx.options,
                    store,
                },
                store
            )
        );
    },
    setup(ctx) {
        const store = ctx.require<RateLimitStore>('rate-limit-store');
        const cleaner = startRateLimitCleaner(store, ctx.options.cleanupIntervalMs);
        ctx.provide('rate-limit-cleaner', cleaner);
    },
    teardown(ctx) {
        const cleaner = ctx.require<ReturnType<typeof setInterval>>('rate-limit-cleaner');
        clearInterval(cleaner);
        const store = ctx.require<RateLimitStore>('rate-limit-store');
        store.clear();
    },
});
