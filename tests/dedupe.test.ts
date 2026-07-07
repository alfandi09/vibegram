import { describe, expect, it, vi } from 'vitest';
import {
    dedupeUpdates,
    MemoryUpdateDedupeStore,
    type UpdateDedupeStore,
} from '../src/dedupe';
import { createContext, createNext, makeMessageUpdate } from './helpers/mock';

describe('dedupeUpdates() middleware', () => {
    it('passes the first update and drops duplicate update_id values', async () => {
        const middleware = dedupeUpdates();
        const update = makeMessageUpdate('hello');
        const first = createContext(update);
        const duplicate = createContext(update);
        const firstNext = createNext();
        const duplicateNext = createNext();

        await middleware(first.ctx, firstNext.next);
        await middleware(duplicate.ctx, duplicateNext.next);

        expect(firstNext.called()).toBe(true);
        expect(duplicateNext.called()).toBe(false);
    });

    it('calls onDuplicate when an update is dropped', async () => {
        const onDuplicate = vi.fn();
        const middleware = dedupeUpdates({ onDuplicate });
        const update = makeMessageUpdate('hello');
        const first = createContext(update);
        const duplicate = createContext(update);

        await middleware(first.ctx, createNext().next);
        await middleware(duplicate.ctx, createNext().next);

        expect(onDuplicate).toHaveBeenCalledWith(duplicate.ctx);
    });

    it('allows the same key after the TTL expires', async () => {
        const store = new MemoryUpdateDedupeStore(100);
        const middleware = dedupeUpdates({
            store,
            ttlMs: 10,
            now: () => 1000,
        });
        const first = createContext(makeMessageUpdate('hello'));
        const second = createContext(makeMessageUpdate('hello'));
        const firstNext = createNext();
        const secondNext = createNext();

        await middleware(first.ctx, firstNext.next);
        store.cleanupExpired(1011);
        await middleware(second.ctx, secondNext.next);

        expect(firstNext.called()).toBe(true);
        expect(secondNext.called()).toBe(true);
    });

    it('supports custom keys and stores', async () => {
        const seenKeys = new Set<string>();
        const store: UpdateDedupeStore = {
            get: vi.fn(key => seenKeys.has(key)),
            set: vi.fn((key: string) => {
                seenKeys.add(key);
            }),
            delete: vi.fn((key: string) => {
                seenKeys.delete(key);
            }),
        };
        const middleware = dedupeUpdates({
            store,
            keyGenerator: ctx => `chat:${ctx.chat?.id}`,
        });
        const first = createContext(makeMessageUpdate('hello'));
        const duplicate = createContext(makeMessageUpdate('different text'));
        const firstNext = createNext();
        const duplicateNext = createNext();

        await middleware(first.ctx, firstNext.next);
        await middleware(duplicate.ctx, duplicateNext.next);

        expect(firstNext.called()).toBe(true);
        expect(duplicateNext.called()).toBe(false);
        expect(store.get).toHaveBeenCalledWith('chat:99');
        expect(store.set).toHaveBeenCalledWith('chat:99', expect.any(Number));
    });

    it('passes through updates without a generated key', async () => {
        const middleware = dedupeUpdates({ keyGenerator: () => undefined });
        const { ctx } = createContext(makeMessageUpdate('hello'));
        const next = createNext();

        await middleware(ctx, next.next);

        expect(next.called()).toBe(true);
    });
});
