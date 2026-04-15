import { describe, it, expect } from 'vitest';
import { apiCache } from '../src/cache';
import { createContext, makeMessageUpdate } from './helpers/mock';

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
});
