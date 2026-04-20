import { Context } from './context';
import { Middleware } from './composer';

export interface SessionStore {
    get(key: string): Promise<any> | any;
    set(key: string, value: any): Promise<void> | void;
    delete(key: string): Promise<void> | void;
}

export class MemorySessionStore implements SessionStore {
    private store = new Map<string, { value: any; expiresAt: number }>();
    private ttlMs: number;
    private maxEntries: number;

    /**
     * @param ttlMs Time-to-live in milliseconds. Defaults to 24 hours.
     * @param maxEntries Maximum number of sessions to store. Oldest entries are evicted when exceeded. Defaults to 10000.
     */
    constructor(ttlMs: number = 86400000, maxEntries: number = 10000) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }

    get(key: string) { 
        const item = this.store.get(key);
        if (!item) return undefined;
        
        if (Date.now() > item.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return item.value; 
    }
    
    set(key: string, value: any) { 
        // Evict oldest entries if capacity exceeded
        if (this.store.size >= this.maxEntries && !this.store.has(key)) {
            const firstKey = this.store.keys().next().value;
            if (firstKey !== undefined) this.store.delete(firstKey);
        }
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs }); 
    }
    
    delete(key: string) { 
        this.store.delete(key); 
    }
}

export interface SessionOptions<S = any> {
    /**
     * Custom storage adapter for integration with Redis, MongoDB, etc.
     * Defaults to the built-in volatile MemorySessionStore.
     */
    store?: SessionStore;
    /**
     * Custom session key generator.
     * Defaults to `${chatId}:${fromId}`.
     */
    getSessionKey?: (ctx: Context) => string | undefined;
    /**
     * Default initial state factory for new sessions.
     */
    initial?: () => S;
}

/**
 * Session middleware with adapter pattern support.
 * Supports typed sessions via generic parameter: `session<MySession>({ initial: () => ({ counter: 0 }) })`
 */
export function session<S = any>(options?: SessionOptions<S>): Middleware<any> {
    const store = options?.store || new MemorySessionStore();

    const getSessionKey = options?.getSessionKey || ((ctx: Context) => {
        const chat = ctx.chat?.id;
        const from = ctx.from?.id;
        if (chat && from) {
            return `${chat}:${from}`;
        }
        return undefined;
    });

    return async (ctx, next) => {
        const key = getSessionKey(ctx);
        if (!key) {
            return next();
        }

        // Load existing session or initialize with default state
        let currentSession = (await store.get(key)) || (options?.initial ? options.initial() : {});
        
        Object.defineProperty(ctx, 'session', {
            get: function () {
                return currentSession;
            },
            set: function (newValue) {
                currentSession = Object.assign({}, newValue);
            }
        });

        await next();

        // Persist updated session to store. If session is null, delete from store.
        if (currentSession == null) {
            await store.delete(key);
        } else {
            await store.set(key, currentSession);
        }
    };
}
