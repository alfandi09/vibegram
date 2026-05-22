import { describe, expect, it } from 'vitest';

import {
    RedisCodexMemoryStore,
    RedisRateLimitStore,
    RedisSessionStore,
    RedisStoreParseError,
} from '../src/index';

class FakeRedis {
    readonly values = new Map<string, string>();
    readonly expirations = new Map<string, number>();

    async get(key: string): Promise<string | null> {
        return this.values.get(key) ?? null;
    }

    async set(key: string, value: string): Promise<void> {
        this.values.set(key, value);
    }

    async del(key: string): Promise<void> {
        this.values.delete(key);
        this.expirations.delete(key);
    }

    async pexpire(key: string, ttlMs: number): Promise<void> {
        this.expirations.set(key, ttlMs);
    }
}

describe('@vibegram/storage-redis', () => {
    it('should persist sessions with prefix and TTL', async () => {
        const redis = new FakeRedis();
        const store = new RedisSessionStore<{ step: string }>(redis, {
            prefix: 'vg:session:',
            ttlMs: 60_000,
        });

        await store.set('42:99', { step: 'checkout' });

        expect(redis.values.get('vg:session:42:99')).toBe(JSON.stringify({ step: 'checkout' }));
        expect(redis.expirations.get('vg:session:42:99')).toBe(60_000);
        await expect(store.get('42:99')).resolves.toEqual({ step: 'checkout' });

        await store.delete('42:99');
        await expect(store.get('42:99')).resolves.toBeUndefined();
    });

    it('should persist rate limit records using the middleware TTL', async () => {
        const redis = new FakeRedis();
        const store = new RedisRateLimitStore(redis, { prefix: 'vg:rl:' });

        await store.set('user:42', { count: 2, resetTime: 12345 }, 5000);

        await expect(store.get('user:42')).resolves.toEqual({ count: 2, resetTime: 12345 });
        expect(redis.expirations.get('vg:rl:user:42')).toBe(5000);
    });

    it('should keep Codex memory ordered and trim to max history while preserving system prompt', async () => {
        const redis = new FakeRedis();
        const store = new RedisCodexMemoryStore(redis, {
            prefix: 'vg:codex:',
            maxHistory: 4,
            ttlMs: 120_000,
        });

        await store.append('user:42', { role: 'system', content: 'Be concise' });
        await store.append('user:42', { role: 'user', content: 'one' });
        await store.append('user:42', { role: 'assistant', content: 'two' });
        await store.append('user:42', { role: 'user', content: 'three' });
        await store.append('user:42', { role: 'assistant', content: 'four' });

        await expect(store.list('user:42')).resolves.toEqual([
            { role: 'system', content: 'Be concise' },
            { role: 'assistant', content: 'two' },
            { role: 'user', content: 'three' },
            { role: 'assistant', content: 'four' },
        ]);
        expect(redis.expirations.get('vg:codex:user:42')).toBe(120_000);
    });

    it('should clear Codex memory by key', async () => {
        const redis = new FakeRedis();
        const store = new RedisCodexMemoryStore(redis, { prefix: 'vg:codex:' });

        await store.append('user:42', { role: 'user', content: 'hello' });
        await store.clear('user:42');

        await expect(store.list('user:42')).resolves.toEqual([]);
    });

    it('should throw predictable parse errors without exposing raw Redis payloads', async () => {
        const redis = new FakeRedis();
        redis.values.set('vg:session:broken', '{"token":');
        const store = new RedisSessionStore(redis, { prefix: 'vg:session:' });

        await expect(store.get('broken')).rejects.toBeInstanceOf(RedisStoreParseError);
        await expect(store.get('broken')).rejects.not.toThrow('{"token":');
    });
});
