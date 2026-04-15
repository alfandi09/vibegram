import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'stream';
import {
    createExpressMiddleware,
    createFastifyPlugin,
    createHonoHandler,
    createNativeHandler,
    createKoaMiddleware,
} from '../src/adapters';

// Minimal mock bot with handleUpdate and webhookCallback
function makeMockBot(secretToken?: string) {
    const bot: any = {
        _calls: [] as any[],
        async handleUpdate(update: any) {
            this._calls.push(update);
        },
        webhookCallback(token?: string) {
            return async (req: any, res: any) => {
                if (token && req.headers?.['x-telegram-bot-api-secret-token'] !== token) {
                    res.statusCode = 403;
                    res.end('Forbidden');
                    return;
                }
                if (!req.body || typeof req.body.update_id !== 'number') {
                    res.statusCode = 400;
                    res.end('Bad Request');
                    return;
                }
                await bot.handleUpdate(req.body);
                res.statusCode = 200;
                res.end('OK');
            };
        },
    };
    return bot;
}

// ---------------------------------------------------------------------------
// Express adapter
// ---------------------------------------------------------------------------
describe('createExpressMiddleware()', () => {
    it('calls bot.handleUpdate on valid POST', async () => {
        const bot = makeMockBot();
        const mw = createExpressMiddleware(bot);

        const req = { method: 'POST', headers: {}, body: { update_id: 1, message: {} } };
        const res = { statusCode: 0, end: vi.fn() };
        const next = vi.fn();

        await mw(req, res, next);

        expect(bot._calls).toHaveLength(1);
        expect(res.statusCode).toBe(200);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when secret token mismatch', async () => {
        const bot = makeMockBot('correct-token');
        const mw = createExpressMiddleware(bot, { secretToken: 'correct-token' });

        const req = {
            method: 'POST',
            headers: { 'x-telegram-bot-api-secret-token': 'wrong-token' },
            body: { update_id: 1 },
        };
        const res = { statusCode: 0, end: vi.fn() };
        await mw(req, res, vi.fn());

        expect(res.statusCode).toBe(403);
        expect(bot._calls).toHaveLength(0);
    });

    it('returns 400 when body has no update_id', async () => {
        const bot = makeMockBot();
        const mw = createExpressMiddleware(bot);

        const req = { method: 'POST', headers: {}, body: { foo: 'bar' } };
        const res = { statusCode: 0, end: vi.fn() };
        await mw(req, res, vi.fn());

        expect(res.statusCode).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// Hono adapter
// ---------------------------------------------------------------------------
describe('createHonoHandler()', () => {
    it('returns 200 on valid update', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn();
        const handler = createHonoHandler(bot);

        const update = { update_id: 5 };
        const c = {
            req: {
                header: () => undefined,
                json: async () => update,
            },
            text: vi.fn((body: string, code: number) => ({ body, code })),
        };

        const result = await handler(c);
        expect(bot.handleUpdate).toHaveBeenCalledWith(update);
        expect(c.text).toHaveBeenCalledWith('OK', 200);
    });

    it('returns 403 on token mismatch', async () => {
        const bot = makeMockBot();
        const handler = createHonoHandler(bot, { secretToken: 'my-secret' });

        const c = {
            req: { header: () => 'wrong', json: async () => ({}) },
            text: vi.fn(),
        };

        await handler(c);
        expect(c.text).toHaveBeenCalledWith('Forbidden', 403);
    });

    it('returns 400 when JSON is not an update', async () => {
        const bot = makeMockBot();
        const handler = createHonoHandler(bot);

        const c = {
            req: {
                header: () => undefined,
                json: async () => ({ not_an_update: true }),
            },
            text: vi.fn(),
        };

        await handler(c);
        expect(c.text).toHaveBeenCalledWith('Bad Request: Invalid update object.', 400);
    });

    it('returns 500 when bot.handleUpdate throws', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn().mockRejectedValue(new Error('boom'));
        const handler = createHonoHandler(bot);

        const c = {
            req: {
                header: () => undefined,
                json: async () => ({ update_id: 9 }),
            },
            text: vi.fn(),
        };

        await handler(c);
        expect(c.text).toHaveBeenCalledWith('Internal Server Error', 500);
    });
});

// ---------------------------------------------------------------------------
// Fastify adapter
// ---------------------------------------------------------------------------
describe('createFastifyPlugin()', () => {
    it('registers route and handles a valid update', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn();
        const plugin = createFastifyPlugin(bot, { path: '/hook' });
        const routeHandler = vi.fn();
        const fastify = {
            post: vi.fn((path: string, handler: any) => {
                routeHandler.mockImplementation(handler);
            }),
        };

        await plugin(fastify as any);

        const reply = {
            code: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };

        await routeHandler({ headers: {}, body: { update_id: 1 } }, reply);

        expect(fastify.post).toHaveBeenCalledWith('/hook', expect.any(Function));
        expect(bot.handleUpdate).toHaveBeenCalledWith({ update_id: 1 });
        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith('OK');
    });

    it('returns 500 when bot.handleUpdate throws', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn().mockRejectedValue(new Error('boom'));
        const plugin = createFastifyPlugin(bot);
        let handler: any;
        const fastify = {
            post: vi.fn((_path: string, registeredHandler: any) => {
                handler = registeredHandler;
            }),
        };

        await plugin(fastify as any);

        const reply = {
            code: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };

        await handler({ headers: {}, body: { update_id: 2 } }, reply);
        expect(reply.code).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith('Internal Server Error');
    });
});

// ---------------------------------------------------------------------------
// Koa adapter
// ---------------------------------------------------------------------------
describe('createKoaMiddleware()', () => {
    it('processes a valid POST request', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn();
        const mw = createKoaMiddleware(bot);

        const ctx: any = {
            method: 'POST',
            get: () => undefined,
            request: { body: { update_id: 10 } },
            status: 0,
            body: '',
        };

        await mw(ctx, vi.fn());
        expect(bot.handleUpdate).toHaveBeenCalledWith({ update_id: 10 });
        expect(ctx.status).toBe(200);
    });

    it('calls next() for non-POST methods', async () => {
        const bot = makeMockBot();
        const mw = createKoaMiddleware(bot);

        const ctx: any = { method: 'GET', get: () => undefined, request: {} };
        const next = vi.fn();

        await mw(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('returns 500 when bot.handleUpdate throws', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn().mockRejectedValue(new Error('boom'));
        const mw = createKoaMiddleware(bot);

        const ctx: any = {
            method: 'POST',
            get: () => undefined,
            request: { body: { update_id: 11 } },
            status: 0,
            body: '',
        };

        await mw(ctx, vi.fn());
        expect(ctx.status).toBe(500);
        expect(ctx.body).toBe('Internal Server Error');
    });
});

// ---------------------------------------------------------------------------
// Native adapter
// ---------------------------------------------------------------------------
describe('createNativeHandler()', () => {
    it('returns 200 for a valid JSON request', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn();
        const handler = createNativeHandler(bot);
        const req = Object.assign(Readable.from([JSON.stringify({ update_id: 99 })]), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
        });
        const res = { writeHead: vi.fn(), end: vi.fn() };

        await handler(req, res);

        expect(bot.handleUpdate).toHaveBeenCalledWith({ update_id: 99 });
        expect(res.writeHead).toHaveBeenCalledWith(200);
        expect(res.end).toHaveBeenCalledWith('OK');
    });

    it('returns 413 when body exceeds max size', async () => {
        const bot = makeMockBot();
        const handler = createNativeHandler(bot, { maxBodySizeBytes: 10 });
        const req = Object.assign(Readable.from([JSON.stringify({ update_id: 123456789 })]), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
        });
        const res = { writeHead: vi.fn(), end: vi.fn() };

        await handler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(413);
        expect(res.end).toHaveBeenCalledWith('Payload Too Large');
        expect(bot._calls).toHaveLength(0);
    });

    it('returns 500 when bot.handleUpdate throws', async () => {
        const bot = makeMockBot();
        bot.handleUpdate = vi.fn().mockRejectedValue(new Error('boom'));
        const handler = createNativeHandler(bot);
        const req = Object.assign(Readable.from([JSON.stringify({ update_id: 10 })]), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
        });
        const res = { writeHead: vi.fn(), end: vi.fn() };

        await handler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
        expect(res.end).toHaveBeenCalledWith('Internal Server Error');
    });
});
