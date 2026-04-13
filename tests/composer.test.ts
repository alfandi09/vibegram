import { describe, it, expect, vi } from 'vitest';
import { Composer } from '../src/composer';
import { Context } from '../src/context';
import {
    makeMessageUpdate,
    makeCommandUpdate,
    makeCallbackQueryUpdate,
    makePhotoUpdate,
    createContext,
    createNext,
} from './helpers/mock';

// ---------------------------------------------------------------------------
// Helper to run a composer against an update
// ---------------------------------------------------------------------------
async function runComposer(composer: Composer<Context>, ctx: Context): Promise<void> {
    let outerCalled = false;
    await composer.middleware()(ctx, async () => { outerCalled = true; });
    return;
}

// ---------------------------------------------------------------------------
// command()
// ---------------------------------------------------------------------------
describe('Composer.command()', () => {
    it('triggers on exact command match', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.command('start', handler);

        const { ctx } = createContext(makeCommandUpdate('start'));
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('injects ctx.command with name and args', async () => {
        const composer = new Composer<Context>();
        let capturedCtx: Context | null = null;
        composer.command('echo', (ctx) => { capturedCtx = ctx; });

        const { ctx } = createContext(makeCommandUpdate('echo', ['hello', 'world']));
        await runComposer(composer, ctx);

        expect(capturedCtx!.command?.name).toBe('echo');
        expect(capturedCtx!.command?.args).toEqual(['hello', 'world']);
    });

    it('strips @botname from command', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.command('start', handler);

        const { ctx } = createContext(makeMessageUpdate('/start@mybot'));
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('does NOT trigger on wrong command', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.command('stop', handler);

        const { ctx } = createContext(makeCommandUpdate('start'));
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });

    it('passes to next() when no command matched', async () => {
        const composer = new Composer<Context>();
        composer.command('stop', vi.fn());

        const { ctx } = createContext(makeCommandUpdate('start'));
        const { next, called } = createNext();
        await composer.middleware()(ctx, next);

        expect(called()).toBe(true);
    });

    it('accepts an array of commands', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.command(['start', 'begin', 'go'], handler);

        for (const cmd of ['start', 'begin', 'go']) {
            const { ctx } = createContext(makeCommandUpdate(cmd));
            await runComposer(composer, ctx);
        }

        expect(handler).toHaveBeenCalledTimes(3);
    });

    it('does NOT trigger when message has no text', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.command('start', handler);

        const { ctx } = createContext(makePhotoUpdate());
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// hears()
// ---------------------------------------------------------------------------
describe('Composer.hears()', () => {
    it('triggers on exact string match', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.hears('hello', handler);

        const { ctx } = createContext(makeMessageUpdate('hello'));
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('does NOT trigger on partial string match', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.hears('hello', handler);

        const { ctx } = createContext(makeMessageUpdate('hello world'));
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });

    it('triggers on RegExp match and injects ctx.match', async () => {
        const composer = new Composer<Context>();
        let capturedCtx: Context | null = null;
        composer.hears(/^order (\d+)$/i, (ctx) => { capturedCtx = ctx; });

        const { ctx } = createContext(makeMessageUpdate('order 42'));
        await runComposer(composer, ctx);

        expect(capturedCtx).not.toBeNull();
        expect(capturedCtx!.match![0]).toBe('order 42');
        expect(capturedCtx!.match![1]).toBe('42');
    });

    it('sets ctx.match to null for plain string match', async () => {
        const composer = new Composer<Context>();
        let capturedCtx: Context | null = null;
        composer.hears('ping', (ctx) => { capturedCtx = ctx; });

        const { ctx } = createContext(makeMessageUpdate('ping'));
        await runComposer(composer, ctx);

        expect(capturedCtx!.match).toBeNull();
    });

    it('accepts array of string/regex triggers', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.hears(['hello', /hi/i], handler);

        const { ctx1 } = { ctx1: createContext(makeMessageUpdate('hello')).ctx };
        const { ctx2 } = { ctx2: createContext(makeMessageUpdate('Hi there')).ctx };
        
        await runComposer(composer, ctx1);
        // 'Hi there' matches /hi/i
        await runComposer(composer, ctx2);

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('skips update when no text is present', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.hears('photo', handler);

        const { ctx } = createContext(makePhotoUpdate());
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// action()
// ---------------------------------------------------------------------------
describe('Composer.action()', () => {
    it('triggers on exact callback data match', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.action('pay_now', handler);

        const { ctx } = createContext(makeCallbackQueryUpdate('pay_now'));
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('triggers on RegExp match and injects ctx.match with capture groups', async () => {
        const composer = new Composer<Context>();
        let capturedCtx: Context | null = null;
        composer.action(/^item_(\d+)$/, (ctx) => { capturedCtx = ctx; });

        const { ctx } = createContext(makeCallbackQueryUpdate('item_99'));
        await runComposer(composer, ctx);

        expect(capturedCtx!.match![1]).toBe('99');
    });

    it('does NOT trigger on non-callback_query update', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.action('pay_now', handler);

        const { ctx } = createContext(makeMessageUpdate('pay_now'));
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });

    it('passes to next() on unmatched callback data', async () => {
        const composer = new Composer<Context>();
        composer.action('yes', vi.fn());

        const { ctx } = createContext(makeCallbackQueryUpdate('no'));
        const { next, called } = createNext();
        await composer.middleware()(ctx, next);

        expect(called()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// on()
// ---------------------------------------------------------------------------
describe('Composer.on()', () => {
    it('triggers on Update root type "message"', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on('message', handler);

        const { ctx } = createContext(makeMessageUpdate('test'));
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('triggers on Message sub-property "photo"', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on('photo', handler);

        const { ctx } = createContext(makePhotoUpdate());
        await runComposer(composer, ctx);

        expect(handler).toHaveBeenCalledOnce();
    });

    it('does NOT trigger on different Update type', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on('callback_query', handler);

        const { ctx } = createContext(makeMessageUpdate('test'));
        await runComposer(composer, ctx);

        expect(handler).not.toHaveBeenCalled();
    });

    it('accepts array of update types', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on(['message', 'callback_query'], handler);

        const { ctx1 } = { ctx1: createContext(makeMessageUpdate('hi')).ctx };
        const { ctx2 } = { ctx2: createContext(makeCallbackQueryUpdate('btn')).ctx };
        
        await runComposer(composer, ctx1);
        await runComposer(composer, ctx2);

        expect(handler).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// use() and middleware chaining
// ---------------------------------------------------------------------------
describe('Composer.use() middleware chain', () => {
    it('executes middlewares in order', async () => {
        const order: number[] = [];
        const composer = new Composer<Context>();

        composer.use(async (_ctx, next) => { order.push(1); await next(); });
        composer.use(async (_ctx, next) => { order.push(2); await next(); });
        composer.use(async (_ctx, _next) => { order.push(3); });

        const { ctx } = createContext(makeMessageUpdate('test'));
        await runComposer(composer, ctx);

        expect(order).toEqual([1, 2, 3]);
    });

    it('throws when next() is called multiple times', async () => {
        const composer = new Composer<Context>();
        composer.use(async (_ctx, next) => {
            await next();
            await next(); // should throw
        });

        const { ctx } = createContext(makeMessageUpdate('test'));
        await expect(runComposer(composer, ctx)).rejects.toThrow('next() called multiple times');
    });
});
