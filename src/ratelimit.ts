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
    /** Custom key generator for per-user tracking. Return undefined to use strictMode/pass-through behavior. */
    keyGenerator?: (ctx: Context) => string | undefined;
    /** Callback invoked when a request exceeds the rate limit. */
    onLimitExceeded?: (ctx: Context, next: () => Promise<void>) => void | Promise<void>;
    /**
     * When true, updates without a resolvable key are blocked instead of passed through.
     * Defaults to false.
     */
    strictMode?: boolean;
}

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

function defaultKeyGenerator(ctx: Context): string | undefined {
    const chatId = ctx.chat?.id;
    const fromId = ctx.from?.id;

    if (chatId !== undefined && fromId !== undefined) return `${chatId}_${fromId}`;
    if (chatId !== undefined) return `chat:${chatId}`;
    if (fromId !== undefined) return `user:${fromId}`;
    if (ctx.update.update_id !== undefined) return `update:${ctx.update.update_id}`;

    return undefined;
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
        // 1. Build a stable key from the best identity available on the update.
        const keyGen = options?.keyGenerator || defaultKeyGenerator;

        const key = keyGen(ctx);
        if (!key) {
            if (options?.strictMode) {
                if (options.onLimitExceeded) {
                    return options.onLimitExceeded(ctx, next);
                }
                console.warn('[Rate Limiter] Blocking unidentified update.');
                return;
            }

            return next();
        }

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
                resetTime: now + windowMsDuration,
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
