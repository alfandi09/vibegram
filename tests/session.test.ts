import { describe, it, expect, vi, beforeEach } from 'vitest';
import { session, MemorySessionStore } from '../src/session';
import {
    makeMessageUpdate,
    createContext,
    createNext,
} from './helpers/mock';

// ---------------------------------------------------------------------------
// MemorySessionStore
// ---------------------------------------------------------------------------
describe('MemorySessionStore', () => {
    it('stores and retrieves a value', () => {
        const store = new MemorySessionStore();
        store.set('key1', { count: 5 });
        expect(store.get('key1')).toEqual({ count: 5 });
    });

    it('returns undefined for missing key', () => {
        const store = new MemorySessionStore();
        expect(store.get('nonexistent')).toBeUndefined();
    });

    it('returns undefined for expired entries', async () => {
        const store = new MemorySessionStore(1); // 1ms TTL
        store.set('key1', { data: 'test' });
        await new Promise(r => setTimeout(r, 5)); // wait for expiry
        expect(store.get('key1')).toBeUndefined();
    });

    it('evicts oldest entry when maxEntries exceeded', () => {
        const store = new MemorySessionStore(86400000, 2);
        store.set('a', 1);
        store.set('b', 2);
        store.set('c', 3); // should evict 'a'
        expect(store.get('a')).toBeUndefined();
        expect(store.get('b')).toBe(2);
        expect(store.get('c')).toBe(3);
    });

    it('deletes a key', () => {
        const store = new MemorySessionStore();
        store.set('key', 'val');
        store.delete('key');
        expect(store.get('key')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// session() middleware
// ---------------------------------------------------------------------------
describe('session() middleware', () => {
    it('initializes session with default initial() factory', async () => {
        const mw = session({ initial: () => ({ count: 0 }) });
        const { ctx } = createContext(makeMessageUpdate('hello'));
        const { next } = createNext();

        let sessionInHandler: any;
        await mw(ctx, async () => {
            sessionInHandler = ctx.session;
            await next();
        });

        expect(sessionInHandler).toEqual({ count: 0 });
    });

    it('persists session changes after middleware completes', async () => {
        const store = new MemorySessionStore();
        const mw = session({ store, initial: () => ({ count: 0 }) });

        const update = makeMessageUpdate('hello');
        const { ctx } = createContext(update);

        // First pass — increment
        await mw(ctx, async () => {
            ctx.session.count++;
        });

        // Second pass — verify persistence
        const { ctx: ctx2 } = createContext(update);
        await mw(ctx2, async () => {
            expect(ctx2.session.count).toBe(1);
        });
    });

    it('verifies custom store.set is called after middleware with session data', async () => {
        const mockStore = {
            get: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        };

        const mw = session({ store: mockStore, initial: () => ({ count: 0 }) });
        const { ctx } = createContext(makeMessageUpdate('hello'));

        await mw(ctx, async () => {
            ctx.session.count = 99;
        });

        // store.set should have been called with the updated session
        expect(mockStore.set).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ count: 99 })
        );
    });

    it('passes to next() when no key can be generated (no chat/from)', async () => {
        const mw = session();
        const update = { update_id: 1, poll: { id: 'p1', question: 'q', options: [], is_anonymous: true, type: 'regular', allows_multiple_answers: false, is_closed: false, total_voter_count: 0 } } as any;
        const { ctx } = createContext(update);
        const { next, called } = createNext();

        await mw(ctx, next);
        expect(called()).toBe(true);
    });

    it('uses custom getSessionKey function', async () => {
        const store = new MemorySessionStore();
        const customKey = vi.fn().mockReturnValue('custom:key');
        const mw = session({ store, getSessionKey: customKey, initial: () => ({}) });

        const { ctx } = createContext(makeMessageUpdate('hello'));
        await mw(ctx, async () => {});

        expect(customKey).toHaveBeenCalledOnce();
        expect(store.get('custom:key')).toBeDefined();
    });
});
