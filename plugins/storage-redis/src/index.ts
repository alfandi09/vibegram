export type RedisMaybePromise<T> = T | Promise<T>;

/** Minimal Redis client contract required by the storage adapters. */
export interface RedisClientLike {
    get(key: string): RedisMaybePromise<string | null | undefined>;
    set(key: string, value: string): RedisMaybePromise<unknown>;
    del?(key: string): RedisMaybePromise<unknown>;
    unlink?(key: string): RedisMaybePromise<unknown>;
    pSetEx?(key: string, milliseconds: number, value: string): RedisMaybePromise<unknown>;
    psetex?(key: string, milliseconds: number, value: string): RedisMaybePromise<unknown>;
    pExpire?(key: string, milliseconds: number): RedisMaybePromise<unknown>;
    pexpire?(key: string, milliseconds: number): RedisMaybePromise<unknown>;
    expire?(key: string, seconds: number): RedisMaybePromise<unknown>;
}

/** Common Redis key-prefix and TTL options shared by stores. */
export interface RedisStoreOptions {
    prefix?: string;
    ttlMs?: number;
}

/** Options for Codex conversation memory stored in Redis. */
export interface RedisCodexMemoryStoreOptions extends RedisStoreOptions {
    maxHistory?: number;
}

/** Serializable VibeGram rate-limit record. */
export interface RateLimitRecord {
    count: number;
    resetTime: number;
}

/** Minimal Codex message shape used by the experimental Codex plugin. */
export interface CodexMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** Thrown when a Redis value cannot be parsed as the expected JSON payload. */
export class RedisStoreParseError extends Error {
    constructor(storeName: string, key: string) {
        super(`[vibegram/storage-redis] Invalid JSON in ${storeName} store for key "${key}".`);
        this.name = 'RedisStoreParseError';
    }
}

class RedisJsonBucket {
    constructor(
        private readonly client: RedisClientLike,
        private readonly storeName: string,
        private readonly prefix: string,
        private readonly ttlMs?: number
    ) {}

    async get<T>(key: string): Promise<T | undefined> {
        const redisKey = this.key(key);
        const raw = await this.client.get(redisKey);

        if (raw === null || raw === undefined) {
            return undefined;
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            throw new RedisStoreParseError(this.storeName, redisKey);
        }
    }

    async set(key: string, value: unknown, ttlMs = this.ttlMs): Promise<void> {
        await setRedisJson(this.client, this.key(key), JSON.stringify(value), ttlMs);
    }

    async delete(key: string): Promise<void> {
        await deleteRedisKey(this.client, this.key(key));
    }

    key(key: string): string {
        return `${this.prefix}${key}`;
    }
}

/** Redis-backed VibeGram session store. */
export class RedisSessionStore<T = unknown> {
    private readonly bucket: RedisJsonBucket;

    constructor(client: RedisClientLike, options: RedisStoreOptions = {}) {
        this.bucket = new RedisJsonBucket(
            client,
            'session',
            options.prefix ?? 'vibegram:session:',
            options.ttlMs ?? 24 * 60 * 60 * 1000
        );
    }

    async get(key: string): Promise<T | undefined> {
        return this.bucket.get<T>(key);
    }

    async set(key: string, value: T): Promise<void> {
        await this.bucket.set(key, value);
    }

    async delete(key: string): Promise<void> {
        await this.bucket.delete(key);
    }
}

/** Redis-backed store for VibeGram inbound rate-limit counters. */
export class RedisRateLimitStore {
    private readonly bucket: RedisJsonBucket;

    constructor(client: RedisClientLike, options: Pick<RedisStoreOptions, 'prefix'> = {}) {
        this.bucket = new RedisJsonBucket(
            client,
            'rate-limit',
            options.prefix ?? 'vibegram:rate-limit:'
        );
    }

    async get(key: string): Promise<RateLimitRecord | undefined> {
        const value = await this.bucket.get<RateLimitRecord>(key);
        if (value === undefined) {
            return undefined;
        }

        if (!isRateLimitRecord(value)) {
            throw new RedisStoreParseError('rate-limit', this.bucket.key(key));
        }

        return value;
    }

    async set(key: string, value: RateLimitRecord, ttlMs: number): Promise<void> {
        if (ttlMs <= 0) {
            await this.delete(key);
            return;
        }

        await this.bucket.set(key, value, ttlMs);
    }

    async delete(key: string): Promise<void> {
        await this.bucket.delete(key);
    }
}

/** Redis-backed Codex memory store with ordered history and sliding-window trim. */
export class RedisCodexMemoryStore {
    private readonly bucket: RedisJsonBucket;
    private readonly maxHistory: number;

    constructor(client: RedisClientLike, options: RedisCodexMemoryStoreOptions = {}) {
        this.bucket = new RedisJsonBucket(
            client,
            'codex-memory',
            options.prefix ?? 'vibegram:codex:',
            options.ttlMs
        );
        this.maxHistory = positiveInteger(options.maxHistory, 20, 'maxHistory');
    }

    async append(key: string, message: CodexMessage): Promise<void> {
        const history = await this.list(key);
        history.push(message);
        await this.bucket.set(key, trimHistory(history, this.maxHistory));
    }

    async list(key: string): Promise<CodexMessage[]> {
        const value = await this.bucket.get<CodexMessage[]>(key);
        if (value === undefined) {
            return [];
        }

        if (!Array.isArray(value)) {
            throw new RedisStoreParseError('codex-memory', this.bucket.key(key));
        }

        return value;
    }

    async clear(key: string): Promise<void> {
        await this.bucket.delete(key);
    }
}

function trimHistory(history: CodexMessage[], maxHistory: number): CodexMessage[] {
    if (history.length <= maxHistory) {
        return history;
    }

    const system = history[0]?.role === 'system' ? [history[0]] : [];
    const tailSize = maxHistory - system.length;
    return [...system, ...history.slice(-tailSize)];
}

async function setRedisJson(
    client: RedisClientLike,
    key: string,
    value: string,
    ttlMs?: number
): Promise<void> {
    if (ttlMs === undefined) {
        await client.set(key, value);
        return;
    }

    const normalizedTtl = positiveInteger(ttlMs, 0, 'ttlMs');
    if (client.pSetEx) {
        await client.pSetEx(key, normalizedTtl, value);
        return;
    }
    if (client.psetex) {
        await client.psetex(key, normalizedTtl, value);
        return;
    }

    await client.set(key, value);
    await applyTtl(client, key, normalizedTtl);
}

async function applyTtl(
    client: RedisClientLike,
    key: string,
    ttlMs: number
): Promise<void> {
    if (client.pExpire) {
        await client.pExpire(key, ttlMs);
        return;
    }
    if (client.pexpire) {
        await client.pexpire(key, ttlMs);
        return;
    }
    if (client.expire) {
        await client.expire(key, Math.ceil(ttlMs / 1000));
        return;
    }

    throw new Error(
        '[vibegram/storage-redis] Redis client must support psetex, pSetEx, pexpire, pExpire, or expire when ttlMs is used.'
    );
}

async function deleteRedisKey(client: RedisClientLike, key: string): Promise<void> {
    if (client.del) {
        await client.del(key);
        return;
    }
    if (client.unlink) {
        await client.unlink(key);
        return;
    }

    throw new Error('[vibegram/storage-redis] Redis client must support del or unlink.');
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`${name} must be a positive integer.`);
    }

    return value;
}

function isRateLimitRecord(value: RateLimitRecord): value is RateLimitRecord {
    return (
        typeof value === 'object' &&
        value !== null &&
        Number.isFinite(value.count) &&
        Number.isFinite(value.resetTime)
    );
}
