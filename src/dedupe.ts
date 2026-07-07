import { Context } from './context';
import { Middleware } from './composer';

type MaybePromise<T> = T | Promise<T>;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 10_000;

export interface UpdateDedupeStore {
    /** Return true when the key is already present and still valid. */
    get(key: string): MaybePromise<boolean>;
    /** Store a key until the absolute expiry timestamp in milliseconds. */
    set(key: string, expiresAtMs: number): MaybePromise<void>;
    /** Optional explicit removal hook for external stores. */
    delete?(key: string): MaybePromise<void>;
}

export interface DedupeUpdatesOptions<C extends Context = Context> {
    /** Time to remember processed update keys. Defaults to 24 hours. */
    ttlMs?: number;
    /** Maximum in-memory entries when no custom store is provided. Defaults to 10,000. */
    maxEntries?: number;
    /** Generate a stable dedupe key. Return undefined to pass the update through. */
    keyGenerator?: (ctx: C) => string | undefined;
    /** External store for cross-process dedupe. */
    store?: UpdateDedupeStore;
    /** Invoked when an update is dropped as a duplicate. */
    onDuplicate?: (ctx: C) => MaybePromise<void>;
    /** Clock hook for tests and deterministic stores. */
    now?: () => number;
}

interface MemoryEntry {
    expiresAtMs: number;
}

/** Bounded in-memory store for update deduplication. */
export class MemoryUpdateDedupeStore implements UpdateDedupeStore {
    private readonly maxEntries: number;
    private readonly entries = new Map<string, MemoryEntry>();

    constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
        validatePositiveIntegerOption('maxEntries', maxEntries);
        this.maxEntries = maxEntries;
    }

    get(key: string): boolean {
        const entry = this.entries.get(key);
        if (!entry) return false;

        if (entry.expiresAtMs <= Date.now()) {
            this.entries.delete(key);
            return false;
        }

        return true;
    }

    set(key: string, expiresAtMs: number): void {
        validatePositiveIntegerOption('expiresAtMs', expiresAtMs);

        this.entries.delete(key);
        this.entries.set(key, { expiresAtMs });
        this.prune();
    }

    delete(key: string): void {
        this.entries.delete(key);
    }

    cleanupExpired(now: number = Date.now()): void {
        for (const [key, entry] of this.entries.entries()) {
            if (entry.expiresAtMs <= now) {
                this.entries.delete(key);
            }
        }
    }

    get size(): number {
        return this.entries.size;
    }

    private prune(): void {
        this.cleanupExpired();

        while (this.entries.size > this.maxEntries) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey === undefined) return;
            this.entries.delete(oldestKey);
        }
    }
}

/** Drop duplicate Telegram updates using update_id by default. */
export function dedupeUpdates<C extends Context = Context>(
    options: DedupeUpdatesOptions<C> = {}
): Middleware<C> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    validatePositiveIntegerOption('ttlMs', ttlMs);

    const store = options.store ?? new MemoryUpdateDedupeStore(options.maxEntries);
    const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
    const now = options.now ?? Date.now;

    return async (ctx, next) => {
        const key = keyGenerator(ctx);
        if (!key) {
            await next();
            return;
        }

        if (await store.get(key)) {
            await options.onDuplicate?.(ctx);
            return;
        }

        await store.set(key, now() + ttlMs);
        await next();
    };
}

function defaultKeyGenerator(ctx: Context): string | undefined {
    const updateId = ctx.update.update_id;
    return typeof updateId === 'number' ? `update:${updateId}` : undefined;
}

function validatePositiveIntegerOption(name: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive integer.`);
    }
}
