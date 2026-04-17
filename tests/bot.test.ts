import { describe, it, expect, vi, afterEach } from 'vitest';
import { Bot } from '../src/bot';
import { makeMessageUpdate } from './helpers/mock';

describe('Bot', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('invalidates cached middleware when use() is called after the first update', async () => {
        const bot = new Bot('test-token');
        const calls: string[] = [];

        bot.use(async (_ctx, next) => {
            calls.push('first');
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('one'));

        bot.use(async (_ctx, next) => {
            calls.push('second');
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('two'));

        expect(calls).toEqual(['first', 'first', 'second']);
    });

    it('returns 400 once for invalid webhook payloads', async () => {
        const bot = new Bot('test-token');
        const handler = bot.webhookCallback();
        const res = { statusCode: 0, end: vi.fn() };

        await handler({ method: 'POST', headers: {}, body: { foo: 'bar' } }, res);

        expect(res.statusCode).toBe(400);
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledWith('Bad Request: Invalid update object.');
    });

    it('returns 500 when webhook processing throws', async () => {
        const bot = new Bot('test-token');
        const handler = bot.webhookCallback();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        bot.use(async () => {
            throw new Error('boom');
        });

        const res = { statusCode: 0, end: vi.fn() };
        await handler({ method: 'POST', headers: {}, body: makeMessageUpdate('hello') }, res);

        expect(res.statusCode).toBe(500);
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledWith('Internal Server Error');
        expect(errorSpy).toHaveBeenCalled();
    });

    it('does not process updates returned after stop() is requested', async () => {
        const bot = new Bot('test-token', { polling: { interval: 0 } });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(bot as any, '_registerSignals').mockImplementation(() => {});

        let resolveUpdates!: (updates: any[]) => void;
        const updatesPromise = new Promise<any[]>(resolve => {
            resolveUpdates = resolve;
        });

        const callApi = vi.fn((method: string) => {
            if (method === 'getMe') {
                return Promise.resolve({ id: 1, is_bot: true, first_name: 'Bot', username: 'bot' });
            }
            if (method === 'getUpdates') {
                return updatesPromise;
            }
            return Promise.resolve(undefined);
        });

        bot.client.callApi = callApi as any;

        const handleUpdateSpy = vi.spyOn(bot, 'handleUpdate');

        await bot.launch();
        const stopPromise = bot.stop('test');

        resolveUpdates([makeMessageUpdate('late update')]);
        await stopPromise;

        expect(handleUpdateSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith('[VibeGram] Bot stopped gracefully.');
    });

    it('emits update lifecycle hooks for success and failure paths', async () => {
        const hooks = {
            onUpdateStart: vi.fn(),
            onUpdateSuccess: vi.fn(),
            onUpdateError: vi.fn(),
            onWebhookError: vi.fn(),
        };
        const bot = new Bot('test-token', { observability: { hooks } });

        await bot.handleUpdate(makeMessageUpdate('hello'));

        expect(hooks.onUpdateStart).toHaveBeenCalledTimes(1);
        expect(hooks.onUpdateSuccess).toHaveBeenCalledTimes(1);
        expect(hooks.onUpdateError).not.toHaveBeenCalled();

        bot.use(async () => {
            throw new Error('boom');
        });

        const handler = bot.webhookCallback();
        const res = { statusCode: 0, end: vi.fn() };
        await handler({ method: 'POST', headers: {}, body: makeMessageUpdate('hello') }, res);

        expect(hooks.onUpdateError).toHaveBeenCalledTimes(1);
        expect(hooks.onWebhookError).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(500);
    });

    it('emits launch and stop hooks', async () => {
        const hooks = {
            onLaunch: vi.fn(),
            onStop: vi.fn(),
        };
        const bot = new Bot('test-token', { polling: { interval: 0 }, observability: { hooks } });
        vi.spyOn(bot as any, '_registerSignals').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        let stopRequested = false;
        bot.client.callApi = vi.fn(async (method: string) => {
            if (method === 'getMe') {
                return { id: 1, is_bot: true, first_name: 'Bot', username: 'bot' };
            }
            if (method === 'getUpdates') {
                if (stopRequested) {
                    return [];
                }
                stopRequested = true;
                return [];
            }
            return undefined;
        }) as any;

        await bot.launch();
        await bot.stop('test-stop');

        expect(hooks.onLaunch).toHaveBeenCalledTimes(1);
        expect(hooks.onStop).toHaveBeenCalledWith({ reason: 'test-stop' });
        expect(logSpy).toHaveBeenCalledWith('[VibeGram] Bot stopped gracefully.');
    });
});
