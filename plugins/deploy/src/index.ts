import { createHash, timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export type MaybePromise<T> = T | Promise<T>;
export type DeployAdapter = 'native' | 'express' | 'fastify' | 'hono';
export type DeployStatus = 'starting' | 'ready' | 'stopping' | 'stopped';
export type DeployUpdate = Record<string, unknown>;

export interface DeployBotClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface DeployBotLike {
    handleUpdate(update: DeployUpdate): MaybePromise<void>;
    setWebhook?(url: string, extra?: Record<string, unknown>): Promise<unknown>;
    deleteWebhook?(dropPendingUpdates?: boolean): Promise<unknown>;
    client?: DeployBotClient;
}

export interface DeployWebhookOptions {
    adapter?: DeployAdapter;
    webhookUrl: string;
    port?: number;
    host?: string;
    path?: string;
    healthPath?: string;
    readinessPath?: string;
    secretToken?: string;
    maxBodySizeBytes?: number;
    webhookOptions?: Record<string, unknown>;
    registerWebhook?: boolean;
    deleteWebhookOnStop?: boolean;
    dropPendingUpdatesOnStop?: boolean;
    allowInsecureWebhookUrl?: boolean;
    signals?: readonly NodeJS.Signals[] | false;
}

export interface DeployWebhookHandle {
    readonly adapter: DeployAdapter;
    readonly webhookUrl: string;
    readonly localUrl: string;
    readonly path: string;
    readonly healthPath: string;
    readonly readinessPath: string;
    readonly server?: Server;
    readonly status: DeployStatus;
    stop(options?: DeployStopOptions): Promise<void>;
}

export interface DeployStopOptions {
    deleteWebhook?: boolean;
    dropPendingUpdates?: boolean;
}

export interface ResolvedWebhookEnv {
    webhookUrl: string;
    port: number;
    secretToken?: string;
    path?: string;
    healthPath?: string;
    readinessPath?: string;
}

export interface WebhookEnvNames {
    webhookUrl?: string;
    port?: string;
    secretToken?: string;
    path?: string;
    healthPath?: string;
    readinessPath?: string;
}

export interface NativeWebhookPreset {
    adapter: 'native';
    path: string;
    healthPath: string;
    readinessPath: string;
    webhookUrl: string;
    handler(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export interface ExpressWebhookPreset {
    adapter: 'express';
    path: string;
    healthPath: string;
    readinessPath: string;
    webhookUrl: string;
    webhookHandler(req: IncomingMessage, res: ServerResponse, next?: (error?: unknown) => void): Promise<void>;
    healthHandler(_req: IncomingMessage, res: ServerResponse): void;
    readinessHandler(_req: IncomingMessage, res: ServerResponse): void;
}

export interface FastifyLikeInstance {
    get(path: string, handler: FastifyHandler): void;
    post(path: string, handler: FastifyHandler): void;
}

export type FastifyHandler = (request: FastifyLikeRequest, reply: FastifyLikeReply) => MaybePromise<void>;

export interface FastifyLikeRequest {
    raw?: IncomingMessage;
    body?: unknown;
    headers?: IncomingHttpHeaders;
}

export interface FastifyLikeReply {
    code(statusCode: number): FastifyLikeReply;
    header(name: string, value: string): FastifyLikeReply;
    send(payload?: unknown): void;
}

export interface FastifyWebhookPreset {
    adapter: 'fastify';
    path: string;
    healthPath: string;
    readinessPath: string;
    webhookUrl: string;
    register(app: FastifyLikeInstance): void;
}

export interface HonoWebhookPreset {
    adapter: 'hono';
    path: string;
    healthPath: string;
    readinessPath: string;
    webhookUrl: string;
    handle(request: Request): Promise<Response>;
}

export type WebhookPreset =
    | NativeWebhookPreset
    | ExpressWebhookPreset
    | FastifyWebhookPreset
    | HonoWebhookPreset;

interface NormalizedDeployWebhookOptions extends Required<Pick<
    DeployWebhookOptions,
    'adapter' | 'path' | 'healthPath' | 'readinessPath' | 'maxBodySizeBytes' | 'registerWebhook' | 'deleteWebhookOnStop' | 'dropPendingUpdatesOnStop' | 'allowInsecureWebhookUrl'
>> {
    webhookUrl: string;
    port: number;
    host: string;
    secretToken?: string;
    webhookOptions: Record<string, unknown>;
    signals: readonly NodeJS.Signals[] | false;
}

interface WebhookProcessorOptions {
    path: string;
    healthPath: string;
    readinessPath: string;
    secretToken?: string;
    maxBodySizeBytes: number;
    getStatus(): DeployStatus;
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PATH = '/webhook';
const DEFAULT_HEALTH_PATH = '/healthz';
const DEFAULT_READINESS_PATH = '/readyz';
const DEFAULT_MAX_BODY_SIZE_BYTES = 1024 * 1024;
const DEFAULT_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
const SECRET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

const DEFAULT_ENV_NAMES: Required<WebhookEnvNames> = {
    webhookUrl: 'WEBHOOK_URL',
    port: 'PORT',
    secretToken: 'TELEGRAM_WEBHOOK_SECRET',
    path: 'WEBHOOK_PATH',
    healthPath: 'HEALTH_PATH',
    readinessPath: 'READINESS_PATH',
};

export class DeployConfigError extends Error {
    constructor(message: string) {
        super(`[vibegram/deploy] ${message}`);
        this.name = 'DeployConfigError';
    }
}

export function readWebhookEnv(
    env: Record<string, string | undefined> = process.env,
    names: WebhookEnvNames = {}
): ResolvedWebhookEnv {
    const keys = { ...DEFAULT_ENV_NAMES, ...names };
    const webhookUrl = readRequiredEnv(env, keys.webhookUrl);
    const portValue = env[keys.port];
    const port = portValue === undefined || portValue === ''
        ? DEFAULT_PORT
        : parsePort(portValue, keys.port);
    const secretToken = normalizeOptionalEnv(env[keys.secretToken]);

    if (secretToken !== undefined) {
        assertSecretToken(secretToken);
    }

    const result: ResolvedWebhookEnv = { webhookUrl, port };
    if (secretToken !== undefined) result.secretToken = secretToken;
    const path = normalizeOptionalEnv(env[keys.path]);
    const healthPath = normalizeOptionalEnv(env[keys.healthPath]);
    const readinessPath = normalizeOptionalEnv(env[keys.readinessPath]);
    if (path !== undefined) result.path = path;
    if (healthPath !== undefined) result.healthPath = healthPath;
    if (readinessPath !== undefined) result.readinessPath = readinessPath;
    return result;
}

export function buildWebhookUrl(publicUrl: string, path = DEFAULT_PATH): string {
    assertPath(path, 'path');
    const url = parseUrl(publicUrl, 'webhookUrl');
    const basePath = trimTrailingSlash(url.pathname === '/' ? '' : url.pathname);
    url.pathname = `${basePath}${path}`;
    url.search = '';
    url.hash = '';
    return url.toString();
}

export async function deployWebhook(
    bot: DeployBotLike,
    options: DeployWebhookOptions
): Promise<DeployWebhookHandle> {
    const normalized = normalizeDeployWebhookOptions(options);
    const webhookUrl = buildWebhookUrl(normalized.webhookUrl, normalized.path);

    if (normalized.adapter !== 'native') {
        if (normalized.registerWebhook) {
            await registerWebhook(bot, webhookUrl, normalized);
        }

        const handle = new FrameworkDeployHandle(normalized.adapter, bot, webhookUrl, normalized);
        handle.markReady();
        return handle;
    }

    const state = { status: 'starting' as DeployStatus };
    const preset = createNativePreset(bot, normalized, webhookUrl, () => state.status);
    const server = createServer((req, res) => {
        void preset.handler(req, res);
    });
    const handle = new NativeDeployHandle(server, bot, webhookUrl, normalized, state);

    server.listen(normalized.port, normalized.host);
    await once(server, 'listening');

    try {
        if (normalized.registerWebhook) {
            await registerWebhook(bot, webhookUrl, normalized);
        }
    } catch (error) {
        await closeServer(server);
        state.status = 'stopped';
        throw error;
    }

    state.status = 'ready';

    if (normalized.signals !== false) {
        handle.attachSignals(normalized.signals);
    }

    return handle;
}

export function createWebhookPreset(
    bot: DeployBotLike,
    options: DeployWebhookOptions
): WebhookPreset {
    const normalized = normalizeDeployWebhookOptions({
        ...options,
        registerWebhook: false,
    });
    const webhookUrl = buildWebhookUrl(normalized.webhookUrl, normalized.path);
    const getStatus = () => 'ready' as DeployStatus;

    if (normalized.adapter === 'native') {
        return createNativePreset(bot, normalized, webhookUrl, getStatus);
    }

    if (normalized.adapter === 'express') {
        return createExpressPreset(bot, normalized, webhookUrl, getStatus);
    }

    if (normalized.adapter === 'fastify') {
        return createFastifyPreset(bot, normalized, webhookUrl, getStatus);
    }

    return createHonoPreset(bot, normalized, webhookUrl, getStatus);
}

function createNativePreset(
    bot: DeployBotLike,
    options: Pick<NormalizedDeployWebhookOptions, 'path' | 'healthPath' | 'readinessPath' | 'secretToken' | 'maxBodySizeBytes'>,
    webhookUrl: string,
    getStatus: () => DeployStatus
): NativeWebhookPreset {
    const processor = new WebhookRequestProcessor(bot, {
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        secretToken: options.secretToken,
        maxBodySizeBytes: options.maxBodySizeBytes,
        getStatus,
    });

    return {
        adapter: 'native',
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        webhookUrl,
        handler: (req, res) => processor.handleNodeRequest(req, res),
    };
}

function createExpressPreset(
    bot: DeployBotLike,
    options: Pick<NormalizedDeployWebhookOptions, 'path' | 'healthPath' | 'readinessPath' | 'secretToken' | 'maxBodySizeBytes'>,
    webhookUrl: string,
    getStatus: () => DeployStatus
): ExpressWebhookPreset {
    const processor = new WebhookRequestProcessor(bot, {
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        secretToken: options.secretToken,
        maxBodySizeBytes: options.maxBodySizeBytes,
        getStatus,
    });

    return {
        adapter: 'express',
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        webhookUrl,
        async webhookHandler(req, res, next) {
            try {
                await processor.handleNodeRequest(req, res, { ignorePath: true });
            } catch (error) {
                if (next) {
                    next(error);
                } else {
                    throw error;
                }
            }
        },
        healthHandler(_req, res) {
            writeTextResponse(res, 200, 'OK');
        },
        readinessHandler(_req, res) {
            writeReadinessResponse(res, getStatus());
        },
    };
}

function createFastifyPreset(
    bot: DeployBotLike,
    options: Pick<NormalizedDeployWebhookOptions, 'path' | 'healthPath' | 'readinessPath' | 'secretToken' | 'maxBodySizeBytes'>,
    webhookUrl: string,
    getStatus: () => DeployStatus
): FastifyWebhookPreset {
    return {
        adapter: 'fastify',
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        webhookUrl,
        register(app) {
            app.get(options.healthPath, (_request, reply) => {
                reply.code(200).header('content-type', 'text/plain; charset=utf-8').send('OK');
            });
            app.get(options.readinessPath, (_request, reply) => {
                const status = getStatus();
                reply
                    .code(status === 'ready' ? 200 : 503)
                    .header('content-type', 'text/plain; charset=utf-8')
                    .send(status === 'ready' ? 'READY' : 'NOT_READY');
            });
            app.post(options.path, async (request, reply) => {
                if (!isSecretTokenAllowed(request.headers ?? request.raw?.headers ?? {}, options.secretToken)) {
                    reply.code(403).send({ ok: false, error: 'invalid secret token' });
                    return;
                }

                try {
                    const update = normalizeFastifyUpdate(request.body);
                    await bot.handleUpdate(update);
                    reply.code(200).send({ ok: true });
                } catch (error) {
                    reply.code(errorToStatusCode(error)).send({
                        ok: false,
                        error: error instanceof Error ? error.message : 'webhook error',
                    });
                }
            });
        },
    };
}

function createHonoPreset(
    bot: DeployBotLike,
    options: Pick<NormalizedDeployWebhookOptions, 'path' | 'healthPath' | 'readinessPath' | 'secretToken' | 'maxBodySizeBytes'>,
    webhookUrl: string,
    getStatus: () => DeployStatus
): HonoWebhookPreset {
    return {
        adapter: 'hono',
        path: options.path,
        healthPath: options.healthPath,
        readinessPath: options.readinessPath,
        webhookUrl,
        async handle(request) {
            const url = new URL(request.url);
            if (request.method === 'GET' && url.pathname === options.healthPath) {
                return new Response('OK', textResponseInit(200));
            }
            if (request.method === 'GET' && url.pathname === options.readinessPath) {
                const status = getStatus();
                return new Response(status === 'ready' ? 'READY' : 'NOT_READY', textResponseInit(status === 'ready' ? 200 : 503));
            }
            if (request.method !== 'POST' || url.pathname !== options.path) {
                return new Response('Not Found', textResponseInit(404));
            }
            if (!isSecretTokenAllowed(request.headers, options.secretToken)) {
                return new Response('Forbidden', textResponseInit(403));
            }

            try {
                const update = await parseFetchJsonBody(request, options.maxBodySizeBytes);
                await bot.handleUpdate(update);
                return new Response('OK', textResponseInit(200));
            } catch (error) {
                return new Response(
                    error instanceof Error ? error.message : 'Webhook Error',
                    textResponseInit(errorToStatusCode(error))
                );
            }
        },
    };
}

class WebhookRequestProcessor {
    constructor(
        private readonly bot: DeployBotLike,
        private readonly options: WebhookProcessorOptions
    ) {}

    async handleNodeRequest(
        req: IncomingMessage,
        res: ServerResponse,
        routeOptions: { ignorePath?: boolean } = {}
    ): Promise<void> {
        const path = getRequestPath(req);

        if (!routeOptions.ignorePath) {
            if (req.method === 'GET' && path === this.options.healthPath) {
                writeTextResponse(res, 200, 'OK');
                return;
            }

            if (req.method === 'GET' && path === this.options.readinessPath) {
                writeReadinessResponse(res, this.options.getStatus());
                return;
            }

            if (path !== this.options.path) {
                writeTextResponse(res, 404, 'Not Found');
                return;
            }
        }

        if (req.method !== 'POST') {
            writeTextResponse(res, 405, 'Method Not Allowed');
            return;
        }

        if (!isSecretTokenAllowed(req.headers, this.options.secretToken)) {
            writeTextResponse(res, 403, 'Forbidden');
            return;
        }

        if (!isJsonRequest(req.headers)) {
            writeTextResponse(res, 415, 'Unsupported Media Type');
            return;
        }

        try {
            const update = await parseNodeJsonBody(req, this.options.maxBodySizeBytes);
            await this.bot.handleUpdate(update);
            writeTextResponse(res, 200, 'OK');
        } catch (error) {
            writeTextResponse(res, errorToStatusCode(error), error instanceof Error ? error.message : 'Bad Request');
        }
    }
}

class NativeDeployHandle implements DeployWebhookHandle {
    private stopping?: Promise<void>;
    private readonly signalHandlers = new Map<NodeJS.Signals, () => void>();

    constructor(
        readonly server: Server,
        private readonly bot: DeployBotLike,
        readonly webhookUrl: string,
        private readonly options: NormalizedDeployWebhookOptions,
        private readonly state: { status: DeployStatus }
    ) {}

    get adapter(): DeployAdapter {
        return 'native';
    }

    get localUrl(): string {
        const address = this.server.address();
        if (!isAddressInfo(address)) {
            return `http://${this.options.host}:${this.options.port}`;
        }

        const host = address.address === '::' || address.address === '0.0.0.0'
            ? '127.0.0.1'
            : address.address;
        return `http://${host}:${address.port}`;
    }

    get path(): string {
        return this.options.path;
    }

    get healthPath(): string {
        return this.options.healthPath;
    }

    get readinessPath(): string {
        return this.options.readinessPath;
    }

    get status(): DeployStatus {
        return this.state.status;
    }

    attachSignals(signals: readonly NodeJS.Signals[]): void {
        for (const signal of signals) {
            const handler = () => {
                void this.stop();
            };
            process.once(signal, handler);
            this.signalHandlers.set(signal, handler);
        }
    }

    async stop(options: DeployStopOptions = {}): Promise<void> {
        if (this.stopping) {
            return this.stopping;
        }

        this.stopping = this.stopOnce(options);
        return this.stopping;
    }

    private async stopOnce(options: DeployStopOptions): Promise<void> {
        this.state.status = 'stopping';
        this.detachSignals();

        await closeServer(this.server);

        if (options.deleteWebhook ?? this.options.deleteWebhookOnStop) {
            await unregisterWebhook(this.bot, this.options, options.dropPendingUpdates);
        }

        this.state.status = 'stopped';
    }

    private detachSignals(): void {
        for (const [signal, handler] of this.signalHandlers) {
            process.removeListener(signal, handler);
        }
        this.signalHandlers.clear();
    }
}

class FrameworkDeployHandle implements DeployWebhookHandle {
    private currentStatus: DeployStatus = 'starting';
    private stopping?: Promise<void>;

    constructor(
        readonly adapter: DeployAdapter,
        private readonly bot: DeployBotLike,
        readonly webhookUrl: string,
        private readonly options: NormalizedDeployWebhookOptions
    ) {}

    get localUrl(): string {
        return '';
    }

    get path(): string {
        return this.options.path;
    }

    get healthPath(): string {
        return this.options.healthPath;
    }

    get readinessPath(): string {
        return this.options.readinessPath;
    }

    get status(): DeployStatus {
        return this.currentStatus;
    }

    markReady(): void {
        this.currentStatus = 'ready';
    }

    async stop(options: DeployStopOptions = {}): Promise<void> {
        if (this.stopping) {
            return this.stopping;
        }

        this.stopping = Promise.resolve().then(async () => {
            this.currentStatus = 'stopping';
            if (options.deleteWebhook ?? this.options.deleteWebhookOnStop) {
                await unregisterWebhook(this.bot, this.options, options.dropPendingUpdates);
            }
            this.currentStatus = 'stopped';
        });
        return this.stopping;
    }
}

function normalizeDeployWebhookOptions(options: DeployWebhookOptions): NormalizedDeployWebhookOptions {
    const adapter = options.adapter ?? 'native';
    if (!['native', 'express', 'fastify', 'hono'].includes(adapter)) {
        throw new DeployConfigError(`adapter must be one of native, express, fastify, or hono`);
    }

    const path = options.path ?? DEFAULT_PATH;
    const healthPath = options.healthPath ?? DEFAULT_HEALTH_PATH;
    const readinessPath = options.readinessPath ?? DEFAULT_READINESS_PATH;
    const port = options.port ?? DEFAULT_PORT;
    const host = options.host ?? DEFAULT_HOST;
    const maxBodySizeBytes = options.maxBodySizeBytes ?? DEFAULT_MAX_BODY_SIZE_BYTES;
    const registerWebhook = options.registerWebhook ?? true;
    const deleteWebhookOnStop = options.deleteWebhookOnStop ?? false;
    const dropPendingUpdatesOnStop = options.dropPendingUpdatesOnStop ?? false;
    const allowInsecureWebhookUrl = options.allowInsecureWebhookUrl ?? false;

    assertPath(path, 'path');
    assertPath(healthPath, 'healthPath');
    assertPath(readinessPath, 'readinessPath');
    assertDistinctPaths(path, healthPath, readinessPath);
    assertPort(port);
    assertMaxBodySize(maxBodySizeBytes);
    if (options.secretToken !== undefined) {
        assertSecretToken(options.secretToken);
    }

    const webhookUrl = buildWebhookUrl(options.webhookUrl, path);
    assertPublicWebhookUrl(webhookUrl, { allowInsecure: allowInsecureWebhookUrl, requireHttps: registerWebhook });

    return {
        adapter,
        webhookUrl: options.webhookUrl,
        port,
        host,
        path,
        healthPath,
        readinessPath,
        secretToken: options.secretToken,
        maxBodySizeBytes,
        webhookOptions: options.webhookOptions ?? {},
        registerWebhook,
        deleteWebhookOnStop,
        dropPendingUpdatesOnStop,
        allowInsecureWebhookUrl,
        signals: options.signals ?? DEFAULT_SIGNALS,
    };
}

async function registerWebhook(
    bot: DeployBotLike,
    url: string,
    options: NormalizedDeployWebhookOptions
): Promise<void> {
    const payload = compactRecord({
        ...options.webhookOptions,
        secret_token: options.secretToken,
    });

    if (bot.setWebhook) {
        await bot.setWebhook(url, payload);
        return;
    }

    if (bot.client) {
        await bot.client.callApi('setWebhook', { url, ...payload });
        return;
    }

    throw new DeployConfigError('bot must expose setWebhook() or client.callApi() when registerWebhook is enabled');
}

async function unregisterWebhook(
    bot: DeployBotLike,
    options: NormalizedDeployWebhookOptions,
    dropPendingUpdates: boolean | undefined
): Promise<void> {
    const drop = dropPendingUpdates ?? options.dropPendingUpdatesOnStop;
    if (bot.deleteWebhook) {
        await bot.deleteWebhook(drop);
        return;
    }

    if (bot.client) {
        await bot.client.callApi('deleteWebhook', { drop_pending_updates: drop });
    }
}

function readRequiredEnv(env: Record<string, string | undefined>, name: string): string {
    const value = normalizeOptionalEnv(env[name]);
    if (value === undefined) {
        throw new DeployConfigError(`${name} is required`);
    }
    return value;
}

function normalizeOptionalEnv(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized === '' ? undefined : normalized;
}

function parsePort(value: string, name: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new DeployConfigError(`${name} must be an integer between 0 and 65535`);
    }
    return port;
}

function assertPort(port: number): void {
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new DeployConfigError('port must be an integer between 0 and 65535');
    }
}

function assertPath(path: string, name: string): void {
    if (!path.startsWith('/') || path.includes('?') || path.includes('#') || path.length < 2) {
        throw new DeployConfigError(`${name} must start with "/" and must not include query/hash fragments`);
    }
}

function assertDistinctPaths(path: string, healthPath: string, readinessPath: string): void {
    const paths = new Set([path, healthPath, readinessPath]);
    if (paths.size !== 3) {
        throw new DeployConfigError('path, healthPath, and readinessPath must be different');
    }
}

function assertMaxBodySize(maxBodySizeBytes: number): void {
    if (!Number.isInteger(maxBodySizeBytes) || maxBodySizeBytes < 1) {
        throw new DeployConfigError('maxBodySizeBytes must be a positive integer');
    }
}

function assertSecretToken(secretToken: string): void {
    if (!SECRET_TOKEN_PATTERN.test(secretToken)) {
        throw new DeployConfigError('secretToken must be 1-256 chars and contain only A-Z, a-z, 0-9, "_" or "-"');
    }
}

function assertPublicWebhookUrl(
    webhookUrl: string,
    options: { allowInsecure: boolean; requireHttps: boolean }
): void {
    const url = parseUrl(webhookUrl, 'webhookUrl');
    if (options.requireHttps && !options.allowInsecure && url.protocol !== 'https:') {
        throw new DeployConfigError('webhookUrl must use https:// for Telegram setWebhook');
    }
}

function parseUrl(value: string, name: string): URL {
    try {
        return new URL(value);
    } catch {
        throw new DeployConfigError(`${name} must be a valid absolute URL`);
    }
}

function trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getRequestPath(req: IncomingMessage): string {
    const rawUrl = req.url ?? '/';
    return new URL(rawUrl, 'http://localhost').pathname;
}

function isJsonRequest(headers: IncomingHttpHeaders): boolean {
    const contentType = readHeader(headers, 'content-type');
    return contentType === undefined || contentType.toLowerCase().includes('application/json');
}

function isSecretTokenAllowed(headers: IncomingHttpHeaders | Headers, expected?: string): boolean {
    if (!expected) {
        return true;
    }

    const actual = headers instanceof Headers
        ? headers.get('x-telegram-bot-api-secret-token') ?? undefined
        : readHeader(headers, 'x-telegram-bot-api-secret-token');

    return actual !== undefined && safeTokenEquals(actual, expected);
}

function readHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

function safeTokenEquals(actual: string, expected: string): boolean {
    const actualHash = createHash('sha256').update(actual).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(actualHash, expectedHash);
}

async function parseNodeJsonBody(req: IncomingMessage, maxBodySizeBytes: number): Promise<DeployUpdate> {
    let size = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
        const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer;
        size += buffer.length;
        if (size > maxBodySizeBytes) {
            throw new PayloadTooLargeError();
        }
        chunks.push(buffer);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    const parsed = JSON.parse(raw) as unknown;
    return normalizeUpdate(parsed);
}

async function parseFetchJsonBody(request: Request, maxBodySizeBytes: number): Promise<DeployUpdate> {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > maxBodySizeBytes) {
        throw new PayloadTooLargeError();
    }
    return normalizeUpdate(JSON.parse(raw) as unknown);
}

function normalizeFastifyUpdate(body: unknown): DeployUpdate {
    return normalizeUpdate(body);
}

function normalizeUpdate(value: unknown): DeployUpdate {
    if (!isRecord(value) || typeof value.update_id !== 'number') {
        throw new DeployConfigError('webhook payload must be a Telegram Update object with numeric update_id');
    }

    return value;
}

function writeReadinessResponse(res: ServerResponse, status: DeployStatus): void {
    writeTextResponse(res, status === 'ready' ? 200 : 503, status === 'ready' ? 'READY' : 'NOT_READY');
}

function writeTextResponse(res: ServerResponse, statusCode: number, body: string): void {
    res.statusCode = statusCode;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(body);
}

function textResponseInit(status: number): ResponseInit {
    return {
        status,
        headers: {
            'content-type': 'text/plain; charset=utf-8',
        },
    };
}

function errorToStatusCode(error: unknown): number {
    if (error instanceof PayloadTooLargeError) {
        return 413;
    }
    if (error instanceof DeployConfigError || error instanceof SyntaxError) {
        return 400;
    }
    return 500;
}

function isAddressInfo(address: string | AddressInfo | null): address is AddressInfo {
    return typeof address === 'object' && address !== null;
}

async function closeServer(server: Server): Promise<void> {
    if (!server.listening) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        server.close(error => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

function isRecord(value: unknown): value is DeployUpdate {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class PayloadTooLargeError extends Error {
    constructor() {
        super('Payload Too Large');
        this.name = 'PayloadTooLargeError';
    }
}
