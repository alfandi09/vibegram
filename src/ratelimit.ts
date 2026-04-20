import { Context } from './context';
import { Middleware } from './composer';

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
}

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

/**
 * Inbound rate limiter middleware.
 * Mirrors Telegram's native rate limit thresholds to protect against request flooding.
 */
export function rateLimit(options?: RateLimitOptions): Middleware<any> {
    const memoryStore = new Map<string, RateLimitRecord>();

    // Periodic cleanup every 60s to prevent memory leaks from expired records.
    const cleaner = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of memoryStore.entries()) {
            if (now > record.resetTime) {
                memoryStore.delete(key);
            }
        }
    }, 60000);
    // unref() allows the Node.js process to exit without waiting for the interval.
    cleaner.unref();

    return async (ctx: Context, next: () => Promise<void>) => {
        // 1. Build a unique key from chat ID + user ID.
        const keyGen = options?.keyGenerator || ((c: Context) => {
            const chatId = c.chat?.id;
            const fromId = c.from?.id;
            if (!chatId || !fromId) return undefined;
            return `${chatId}_${fromId}`;
        });

        const key = keyGen(ctx);
        // If no key is resolvable (e.g., anonymous inline events), pass through.
        if (!key) return next();

        // 2. Dynamically calibrate limits based on chat type.
        const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

        const defaultWindow = isGroup ? 60000 : 1000;
        const defaultLimit = isGroup ? 20 : 1;

        const windowMsDuration = options?.windowMs ?? defaultWindow;
        const limitCount = options?.limit ?? defaultLimit;

        const now = Date.now();
        let record = memoryStore.get(key);

        // 3. Initialize or reset the record if the window has expired.
        if (!record || now > record.resetTime) {
            record = {
                count: 1,
                resetTime: now + windowMsDuration
            };
            memoryStore.set(key, record);
            return next();
        }

        // 4. Increment and evaluate against the limit.
        record.count++;

        if (record.count > limitCount) {
            if (options?.onLimitExceeded) {
                return options.onLimitExceeded(ctx, next);
            }
            // Default: silent throttle — drop the request without responding.
            console.warn(`[Rate Limiter] Throttling request from ${key}.`);
            return;
        }

        return next();
    };
}

