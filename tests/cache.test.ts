import { describe, it, expect, vi } from 'vitest';
import { apiCache, MemoryCache } from '../src/cache';
import { Context } from '../src/context';
import { TelegramClient } from '../src/client';
import { createContext, makeMessageUpdate } from './helpers/mock';

describe('MemoryCache', () => {
    it('evicts the least-recently-used entry, not insertion order', async () => {
        const cache = new MemoryCache(2);
        await cache.set('a', 1, 60000);
        await cache.set('b', 2, 60000);
        // Touch 'a' so 'b' becomes least-recently-used.
        await cache.get('a');
        await cache.set('c', 3, 60000); // should evict 'b', not 'a'

        expect(await cache.get('a')).toBe(1);
        expect(await cache.get('b')).toBeUndefined();
        expect(await cache.get('c')).toBe(3);
    });
});

describe('apiCache()', () => {
    it('restores ctx.client.callApi when downstream middleware throws', async () => {
        const middleware = apiCache();
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        const originalSpy = client.callApi as any;

        await expect(
            middleware(ctx as any, async () => {
                await ctx.client.callApi('getMe');
                throw new Error('boom');
            })
        ).rejects.toThrow('boom');

        await ctx.client.callApi('sendMessage', { chat_id: 99, text: 'after' });
        expect(originalSpy).toHaveBeenLastCalledWith('sendMessage', {
            chat_id: 99,
            text: 'after',
        });
    });

    it('keeps cache decoration isolated per context when updates share the same base client', async () => {
        const middleware = apiCache();
        const baseClient = Object.create(TelegramClient.prototype) as TelegramClient;
        (baseClient as any)._token = 'test-token:AABBCC';
        (baseClient as any).callApi = vi.fn().mockResolvedValue({ ok: true });

        const ctxA = new Context(makeMessageUpdate('first'), baseClient);
        const ctxB = new Context(makeMessageUpdate('second'), baseClient);

        await middleware(ctxA as any, async () => {
            await ctxA.client.callApi('getMe');
            await ctxA.client.callApi('getMe');
            await ctxB.client.callApi('getMe');
        });

        expect((baseClient as any).callApi).toHaveBeenCalledTimes(2);
    });
});
