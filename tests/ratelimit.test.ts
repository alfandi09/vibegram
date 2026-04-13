import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '../src/ratelimit';
import {
    makeMessageUpdate,
    makeGroupMessageUpdate,
    createContext,
    createNext,
} from './helpers/mock';

// ---------------------------------------------------------------------------
// Basic limiting
// ---------------------------------------------------------------------------
describe('rateLimit() middleware', () => {
    it('passes the first request in a window', async () => {
        const mw = rateLimit({ windowMs: 1000, limit: 2 });
        const { ctx } = createContext(makeMessageUpdate('hi'));
        const { next, called } = createNext();

        await mw(ctx, next);
        expect(called()).toBe(true);
    });

    it('blocks when limit is exceeded', async () => {
        const mw = rateLimit({ windowMs: 5000, limit: 1 });
        const { ctx } = createContext(makeMessageUpdate('hi'));
        
        // First request — should pass
        const { next: next1, called: called1 } = createNext();
        await mw(ctx, next1);
        expect(called1()).toBe(true);

        // Second request in same window — should be blocked
        const { next: next2, called: called2 } = createNext();
        await mw(ctx, next2);
        expect(called2()).toBe(false);
    });

    it('calls onLimitExceeded callback instead of silent drop', async () => {
        const onLimitExceeded = vi.fn();
        const mw = rateLimit({ windowMs: 5000, limit: 1, onLimitExceeded });

        const { ctx } = createContext(makeMessageUpdate('hi'));

        const no = createNext();
        await mw(ctx, no.next);

        const no2 = createNext();
        await mw(ctx, no2.next);

        expect(onLimitExceeded).toHaveBeenCalledOnce();
    });

    it('passes through when no key can be generated (no chat or from)', async () => {
        const mw = rateLimit();
        const update = { update_id: 1, poll: { id: 'p', question: 'q?', options: [], is_anonymous: true, type: 'regular', allows_multiple_answers: false, is_closed: false, total_voter_count: 0 } } as any;
        const { ctx } = createContext(update);
        const { next, called } = createNext();

        await mw(ctx, next);
        expect(called()).toBe(true);
    });

    it('uses custom keyGenerator', async () => {
        const customKey = vi.fn().mockReturnValue('user:42');
        const mw = rateLimit({ windowMs: 5000, limit: 1, keyGenerator: customKey });

        const { ctx } = createContext(makeMessageUpdate('hi'));
        const { next } = createNext();
        await mw(ctx, next);

        expect(customKey).toHaveBeenCalledWith(ctx);
    });

    it('applies higher default limits for group chats (20 per 60s)', async () => {
        // Default group limit is 20; we push 21 requests
        const mw = rateLimit(); // defaults apply
        let blockedCount = 0;
        
        const { ctx } = createContext(makeGroupMessageUpdate('test'));

        for (let i = 0; i < 21; i++) {
            const { next, called } = createNext();
            await mw(ctx, next);
            if (!called()) blockedCount++;
        }
        
        expect(blockedCount).toBe(1); // only last one should be blocked
    });

    it('resets counter after window expires', async () => {
        const mw = rateLimit({ windowMs: 50, limit: 1 });
        const { ctx } = createContext(makeMessageUpdate('hi'));

        // First request — passes
        const { next: n1, called: c1 } = createNext();
        await mw(ctx, n1);
        expect(c1()).toBe(true);

        // Second request in window — blocked
        const { next: n2, called: c2 } = createNext();
        await mw(ctx, n2);
        expect(c2()).toBe(false);

        // Wait for window to expire
        await new Promise(r => setTimeout(r, 60));

        // Third request — new window, should pass
        const { next: n3, called: c3 } = createNext();
        await mw(ctx, n3);
        expect(c3()).toBe(true);
    });
});
