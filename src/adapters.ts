/**
 * VibeGram Web Framework Adapters
 *
 * Provides ready-made webhook handler factories for the most popular
 * Node.js HTTP frameworks. Each adapter converts the framework's native
 * request/response objects into VibeGram's generic webhook interface.
 *
 * Usage:
 * ```typescript
 * import { Bot, createExpressMiddleware, createFastifyPlugin, createHonoHandler } from 'vibegram';
 *
 * // Express
 * app.post('/webhook', createExpressMiddleware(bot, { secretToken: 'my-secret' }));
 *
 * // Fastify
 * fastify.register(createFastifyPlugin(bot), { secretToken: 'my-secret' });
 *
 * // Hono
 * app.post('/webhook', createHonoHandler(bot));
 *
 * // Native http / https
 * http.createServer(createNativeHandler(bot)).listen(3000);
 * ```
 */

import type { Bot } from './bot';
import * as crypto from 'crypto';

const DEFAULT_MAX_BODY_SIZE_BYTES = 1_000_000;
const HEALTH_CHECK_RESPONSE_BODY = 'OK';

interface ChainableReply {
    code(statusCode: number): { send(body: string): unknown };
}

export interface AdapterOptions {
    /** Telegram secret token to validate X-Telegram-Bot-Api-Secret-Token header. */
    secretToken?: string;
    /** URL path to listen on. Used only by Fastify plugin adapter. Default: '/webhook'. */
    path?: string;
    /** Optional GET path that returns 200 OK for uptime checks without processing updates. */
    healthPath?: string;
    /** Maximum raw body size for the native adapter. Default: 1 MB. */
    maxBodySizeBytes?: number;
}

function assertAdapterOptions(options?: AdapterOptions): void {
    if (!options) return;

    if (options.secretToken !== undefined) {
        if (typeof options.secretToken !== 'string' || options.secretToken.trim() === '') {
            throw new TypeError('Adapter option "secretToken" must be a non-empty string.');
        }
    }

    if (options.path !== undefined) {
        if (typeof options.path !== 'string' || !options.path.startsWith('/')) {
            throw new TypeError('Adapter option "path" must be a string that starts with "/".');
        }
    }

    if (options.healthPath !== undefined) {
        if (typeof options.healthPath !== 'string' || !options.healthPath.startsWith('/')) {
            throw new TypeError(
                'Adapter option "healthPath" must be a string that starts with "/".'
            );
        }
    }

    if (options.maxBodySizeBytes !== undefined) {
        if (!Number.isInteger(options.maxBodySizeBytes) || options.maxBodySizeBytes <= 0) {
            throw new TypeError('Adapter option "maxBodySizeBytes" must be a positive integer.');
        }
    }
}

export function matchesSecretToken(actual: unknown, expected?: string): boolean {
    if (!expected) return true;
    if (typeof actual !== 'string') return false;

    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function hasJsonContentType(contentType: unknown): boolean {
    return (
        typeof contentType === 'string' && contentType.toLowerCase().includes('application/json')
    );
}

function getRequestPath(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.trim() === '') {
        return undefined;
    }

    try {
        return new URL(value, 'http://localhost').pathname;
    } catch {
        return undefined;
    }
}

function isHealthCheckRequest(
    method: unknown,
    pathCandidate: unknown,
    healthPath?: string
): boolean {
    return (
        method === 'GET' && healthPath !== undefined && getRequestPath(pathCandidate) === healthPath
    );
}

function sendHealthCheckResponse(res: {
    writeHead?: (statusCode: number) => void;
    end: (body?: string) => void;
    statusCode?: number;
}): void {
    if (typeof res.writeHead === 'function') {
        res.writeHead(200);
    } else {
        res.statusCode = 200;
    }

    res.end(HEALTH_CHECK_RESPONSE_BODY);
}

// ---------------------------------------------------------------------------
// Express.js adapter
// ---------------------------------------------------------------------------

/**
 * Returns an Express.js-compatible middleware function.
 * Requires express.json() or body-parser to be applied before this middleware.
 *
 * @example
 * app.use(express.json());
 * app.post('/webhook', createExpressMiddleware(bot, { secretToken: 'abc' }));
 */
export function createExpressMiddleware(bot: Bot, options?: AdapterOptions) {
    assertAdapterOptions(options);
    const handler = bot.webhookCallback(options?.secretToken);
    return async (req: any, res: any, next: any) => {
        if (
            isHealthCheckRequest(
                req.method,
                req.path ?? req.url ?? req.originalUrl,
                options?.healthPath
            )
        ) {
            sendHealthCheckResponse(res);
            return;
        }

        try {
            await handler(req, res);
        } catch (err) {
            next(err);
        }
    };
}

// ---------------------------------------------------------------------------
// Fastify adapter
// ---------------------------------------------------------------------------

/**
 * Returns a Fastify plugin (compatible with Fastify v4+).
 * Registers a POST route at the specified path.
 *
 * @example
 * await fastify.register(createFastifyPlugin(bot), { secretToken: 'abc', path: '/webhook' });
 */
export function createFastifyPlugin(bot: Bot, options?: AdapterOptions) {
    assertAdapterOptions(options);
    const path = options?.path || '/webhook';
    const healthPath = options?.healthPath;
    const secretToken = options?.secretToken;

    return async function plugin(fastify: any) {
        if (healthPath) {
            fastify.get(healthPath, async (_request: unknown, reply: ChainableReply) =>
                reply.code(200).send(HEALTH_CHECK_RESPONSE_BODY)
            );
        }

        fastify.post(path, async (request: any, reply: any) => {
            // Validate secret token if provided.
            const header = request.headers['x-telegram-bot-api-secret-token'];
            if (!matchesSecretToken(header, secretToken)) {
                return reply.code(403).send('Forbidden');
            }

            const update = request.body;

            // Basic structural validation.
            if (!update || typeof update !== 'object' || typeof update.update_id !== 'number') {
                return reply.code(400).send('Bad Request: Invalid update object.');
            }

            try {
                await bot.handleUpdate(update);
                return reply.code(200).send('OK');
            } catch {
                return reply.code(500).send('Internal Server Error');
            }
        });
    };
}

// ---------------------------------------------------------------------------
// Hono adapter
// ---------------------------------------------------------------------------

/**
 * Returns a Hono-compatible route handler.
 * Compatible with Hono v3+.
 *
 * @example
 * app.post('/webhook', createHonoHandler(bot, { secretToken: 'abc' }));
 */
export function createHonoHandler(bot: Bot, options?: AdapterOptions) {
    assertAdapterOptions(options);
    const secretToken = options?.secretToken;

    return async (c: any) => {
        if (isHealthCheckRequest(c.req.method, c.req.path ?? c.req.url, options?.healthPath)) {
            return c.text(HEALTH_CHECK_RESPONSE_BODY, 200);
        }

        const header = c.req.header('x-telegram-bot-api-secret-token');
        if (!matchesSecretToken(header, secretToken)) {
            return c.text('Forbidden', 403);
        }

        let update: any;
        try {
            update = await c.req.json();
        } catch {
            return c.text('Bad Request: Cannot parse JSON body.', 400);
        }

        if (!update || typeof update.update_id !== 'number') {
            return c.text('Bad Request: Invalid update object.', 400);
        }

        try {
            await bot.handleUpdate(update);
            return c.text('OK', 200);
        } catch {
            return c.text('Internal Server Error', 500);
        }
    };
}

// ---------------------------------------------------------------------------
// Native Node.js http/https adapter
// ---------------------------------------------------------------------------

/**
 * Returns a native Node.js http.IncomingMessage handler.
 * Reads the raw body buffer, parses JSON, and dispatches to the bot.
 *
 * @example
 * import http from 'http';
 * http.createServer(createNativeHandler(bot, { secretToken: 'abc' })).listen(3000);
 */
export function createNativeHandler(bot: Bot, options?: AdapterOptions) {
    assertAdapterOptions(options);
    const secretToken = options?.secretToken;
    const healthPath = options?.healthPath;
    const maxBodySizeBytes = options?.maxBodySizeBytes ?? DEFAULT_MAX_BODY_SIZE_BYTES;

    return async (req: any, res: any) => {
        if (isHealthCheckRequest(req.method, req.url, healthPath)) {
            sendHealthCheckResponse(res);
            return;
        }

        if (req.method !== 'POST') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Validate secret token.
        const header = req.headers['x-telegram-bot-api-secret-token'];
        if (!matchesSecretToken(header, secretToken)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        if (!hasJsonContentType(req.headers['content-type'])) {
            res.writeHead(415);
            res.end('Unsupported Media Type');
            return;
        }

        // Read the raw request body.
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        for await (const chunk of req) {
            const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            totalBytes += bufferChunk.length;

            if (totalBytes > maxBodySizeBytes) {
                res.writeHead(413);
                res.end('Payload Too Large');
                return;
            }

            chunks.push(bufferChunk);
        }

        let update: any;
        try {
            update = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        } catch {
            res.writeHead(400);
            res.end('Bad Request: Cannot parse JSON body.');
            return;
        }

        if (!update || typeof update.update_id !== 'number') {
            res.writeHead(400);
            res.end('Bad Request: Invalid update object.');
            return;
        }

        try {
            await bot.handleUpdate(update);
        } catch {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
        }

        res.writeHead(200);
        res.end('OK');
    };
}

// ---------------------------------------------------------------------------
// Koa adapter
// ---------------------------------------------------------------------------

/**
 * Returns a Koa-compatible middleware function.
 * Requires koa-bodyparser to be applied before.
 *
 * @example
 * app.use(koaBodyParser());
 * router.post('/webhook', createKoaMiddleware(bot, { secretToken: 'abc' }));
 */
export function createKoaMiddleware(bot: Bot, options?: AdapterOptions) {
    assertAdapterOptions(options);
    const secretToken = options?.secretToken;

    return async (ctx: any, next: any) => {
        if (isHealthCheckRequest(ctx.method, ctx.path ?? ctx.url, options?.healthPath)) {
            ctx.status = 200;
            ctx.body = HEALTH_CHECK_RESPONSE_BODY;
            return;
        }

        if (ctx.method !== 'POST') {
            return next();
        }

        const header = ctx.get('x-telegram-bot-api-secret-token');
        if (!matchesSecretToken(header, secretToken)) {
            ctx.status = 403;
            ctx.body = 'Forbidden';
            return;
        }

        const update = ctx.request.body;

        if (!update || typeof update.update_id !== 'number') {
            ctx.status = 400;
            ctx.body = 'Bad Request: Invalid update object.';
            return;
        }

        try {
            await bot.handleUpdate(update);
            ctx.status = 200;
            ctx.body = 'OK';
        } catch {
            ctx.status = 500;
            ctx.body = 'Internal Server Error';
        }
    };
}
