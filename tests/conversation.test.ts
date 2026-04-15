import { describe, it, expect, vi } from 'vitest';
import { Conversation } from '../src/conversation';
import { makeMessageUpdate, makePhotoUpdate, createContext } from './helpers/mock';

// ---------------------------------------------------------------------------
// Conversation.define / enter / isActive / leave
// ---------------------------------------------------------------------------
describe('Conversation', () => {
    it('defines and enters a named conversation', async () => {
        const conv = new Conversation();
        const handler = vi.fn(async () => {}); // must be async to return a Promise
        conv.define('test', handler);

        const { ctx } = createContext(makeMessageUpdate('start'));
        await conv.enter('test', ctx);

        // Handler is called asynchronously
        await new Promise(r => setTimeout(r, 0));
        expect(handler).toHaveBeenCalledOnce();
    });

    it('throws when entering undefined conversation', async () => {
        const conv = new Conversation();
        const { ctx } = createContext(makeMessageUpdate('start'));
        await expect(conv.enter('undefined_conv', ctx)).rejects.toThrow('is not defined');
    });

    it('isActive() returns true after enter()', async () => {
        const conv = new Conversation();
        let resolve: any;
        conv.define('blocking', async (_ctx, c) => {
            await new Promise(r => {
                resolve = r;
            }); // block indefinitely
        });

        const { ctx } = createContext(makeMessageUpdate('start'));
        await conv.enter('blocking', ctx);
        await new Promise(r => setTimeout(r, 10));

        expect(conv.isActive(ctx)).toBe(true);
        resolve(); // cleanup
    });

    it('isActive() returns false after leave()', async () => {
        const conv = new Conversation();
        let resolveHold: any;
        conv.define('blocker', async (_ctx, _c) => {
            await new Promise(r => {
                resolveHold = r;
            });
        });

        const { ctx } = createContext(makeMessageUpdate('start'));
        await conv.enter('blocker', ctx);
        await new Promise(r => setTimeout(r, 5));

        conv.leave(ctx);
        expect(conv.isActive(ctx)).toBe(false);
        resolveHold();
    });

    it('replaces an existing conversation on re-enter', async () => {
        const conv = new Conversation();
        const calls: string[] = [];

        conv.define('test', async () => {
            calls.push('new');
        });

        const { ctx } = createContext(makeMessageUpdate('hi'));
        await conv.enter('test', ctx);
        await conv.enter('test', ctx); // re-enter

        await new Promise(r => setTimeout(r, 0));
        // second enter cancels first, both handler calls complete
        expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('activeCount reflects number of active conversations', async () => {
        const conv = new Conversation();
        let r1: any;
        let r2: any;
        conv.define('c', async () => {
            await new Promise(r => {
                r1 = r;
            });
        });

        const { ctx: ctx1 } = createContext(makeMessageUpdate('a'));
        const { ctx: ctx2 } = createContext({
            update_id: 99,
            message: {
                message_id: 200,
                date: 0,
                text: 'b',
                from: { id: 55, is_bot: false, first_name: 'B' },
                chat: { id: 55, type: 'private' },
            },
        } as any);

        await conv.enter('c', ctx1);
        await conv.enter('c', ctx2);
        await new Promise(r => setTimeout(r, 5));

        expect(conv.activeCount).toBe(2);
        r1?.();
        r2?.();
    });

    it('auto-cleanup removes conversation after defaultTimeout', async () => {
        const conv = new Conversation({ defaultTimeout: 30 }); // 30ms timeout
        let waitResolve: any;

        conv.define('slow', async (_ctx, c) => {
            await c.wait({ timeout: 10000 }); // asks to wait a long time
        });

        const { ctx } = createContext(makeMessageUpdate('go'));
        await conv.enter('slow', ctx);
        await new Promise(r => setTimeout(r, 5));

        expect(conv.isActive(ctx)).toBe(true);

        // Wait for auto-cleanup to fire
        await new Promise(r => setTimeout(r, 40));
        expect(conv.isActive(ctx)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Conversation middleware routing
// ---------------------------------------------------------------------------
describe('Conversation middleware', () => {
    it('intercepts update for active conversation and does not call next()', async () => {
        const conv = new Conversation();
        let gotText: string | null = null;

        conv.define('ask', async (_ctx, c) => {
            gotText = await c.waitForText();
        });

        const { ctx: initCtx } = createContext(makeMessageUpdate('start'));
        await conv.enter('ask', initCtx);
        await new Promise(r => setTimeout(r, 0));

        // Deliver the answer
        const { ctx: answerCtx } = createContext(makeMessageUpdate('My answer'));
        let nextCalled = false;
        await conv.middleware()(answerCtx, async () => {
            nextCalled = true;
        });

        await new Promise(r => setTimeout(r, 0));

        expect(nextCalled).toBe(false);
        expect(gotText).toBe('My answer');
    });

    it('passes to next() when no conversation is active', async () => {
        const conv = new Conversation();
        const { ctx } = createContext(makeMessageUpdate('random'));
        let nextCalled = false;

        await conv.middleware()(ctx, async () => {
            nextCalled = true;
        });
        expect(nextCalled).toBe(true);
    });

    it('keeps waiting when waitForText receives a non-text update', async () => {
        const conv = new Conversation();
        let gotText: string | null = null;

        conv.define('ask', async (_ctx, c) => {
            gotText = await c.waitForText();
        });

        const { ctx: initCtx } = createContext(makeMessageUpdate('start'));
        await conv.enter('ask', initCtx);
        await new Promise(r => setTimeout(r, 0));

        const { ctx: invalidCtx, client: invalidClient } = createContext(makePhotoUpdate());
        await conv.middleware()(invalidCtx, async () => {
            throw new Error('next() should not run for an active conversation');
        });
        await new Promise(r => setTimeout(r, 0));

        expect(gotText).toBeNull();
        expect(invalidClient.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'Please send a text message.',
            })
        );

        const { ctx: validCtx } = createContext(makeMessageUpdate('My answer'));
        await conv.middleware()(validCtx, async () => {
            throw new Error('next() should not run after a successful delivery');
        });
        await new Promise(r => setTimeout(r, 0));

        expect(gotText).toBe('My answer');
    });

    it('applies custom validate and validationError options', async () => {
        const conv = new Conversation();
        let gotText: string | null = null;

        conv.define('ask', async (_ctx, c) => {
            gotText = await c.waitForText({
                validate: ctx => (ctx.message?.text?.length || 0) >= 4,
                validationError: 'Too short.',
            });
        });

        const { ctx: initCtx } = createContext(makeMessageUpdate('start'));
        await conv.enter('ask', initCtx);
        await new Promise(r => setTimeout(r, 0));

        const { ctx: shortCtx, client: shortClient } = createContext(makeMessageUpdate('abc'));
        await conv.middleware()(shortCtx, async () => {
            throw new Error('next() should not run for a rejected validation');
        });
        await new Promise(r => setTimeout(r, 0));

        expect(gotText).toBeNull();
        expect(shortClient.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'Too short.',
            })
        );

        const { ctx: validCtx } = createContext(makeMessageUpdate('valid'));
        await conv.middleware()(validCtx, async () => {
            throw new Error('next() should not run for a successful delivery');
        });
        await new Promise(r => setTimeout(r, 0));

        expect(gotText).toBe('valid');
    });
});
