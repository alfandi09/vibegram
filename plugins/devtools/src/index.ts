import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type MaybePromise<T> = T | Promise<T>;
export type DevtoolsUpdate = Record<string, unknown>;
export type DevtoolsClock = () => number;

export interface DevtoolsClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface DevtoolsContext {
    update?: DevtoolsUpdate;
    chat?: { id?: number | string; [key: string]: unknown };
    from?: { id?: number; [key: string]: unknown };
    client: DevtoolsClient;
    devtools?: DevtoolsSession;
    [key: string]: unknown;
}

export type DevtoolsMiddleware<C extends DevtoolsContext = DevtoolsContext> = (
    ctx: C,
    next: () => Promise<void>
) => Promise<void>;

export type DevtoolsFlavor<C> = C & {
    devtools: DevtoolsSession;
};

export type DevtoolsCapture<C extends DevtoolsContext = DevtoolsContext> =
    | boolean
    | ((ctx: C) => MaybePromise<boolean>);

export interface DevtoolsLogEvent {
    type: string;
    timestamp?: string;
    [key: string]: unknown;
}

export interface DevtoolsSink {
    write(event: DevtoolsLogEvent): MaybePromise<void>;
}

export interface SanitizerOptions {
    redact?: readonly string[];
    replacement?: string;
    maxDepth?: number;
}

export interface DevtoolsOptions<C extends DevtoolsContext = DevtoolsContext>
    extends SanitizerOptions {
    capture?: DevtoolsCapture<C>;
    env?: string;
    sink?: DevtoolsSink;
    jsonlPath?: string;
    includeApiResult?: boolean;
    failOnSinkError?: boolean;
    clock?: DevtoolsClock;
}

type DevtoolsSinkOptions = Pick<DevtoolsOptions, 'sink' | 'jsonlPath'>;
type DevtoolsSessionOptions = Pick<DevtoolsOptions, 'failOnSinkError'>;

export interface DevtoolsSession {
    readonly updateId: number | undefined;
    time<T>(name: string, fn: () => MaybePromise<T>): Promise<T>;
    record(event: DevtoolsLogEvent): Promise<void>;
}

export type ReplayTarget =
    | ((update: DevtoolsUpdate) => MaybePromise<void>)
    | { handleUpdate(update: DevtoolsUpdate): MaybePromise<void> };

export interface ReplayOptions extends SanitizerOptions {
    sanitize?: boolean;
}

const DEFAULT_REDACT_KEYS = [
    'access_token',
    'api_key',
    'authorization',
    'bot_token',
    'cookie',
    'password',
    'prompt',
    'secret',
    'secret_token',
    'token',
];

const DEFAULT_REPLACEMENT = '[REDACTED]';
const DEFAULT_MAX_DEPTH = 12;

/** In-memory sink used by tests and local tooling. */
export class MemoryDevtoolsSink implements DevtoolsSink {
    readonly events: DevtoolsLogEvent[] = [];

    async write(event: DevtoolsLogEvent): Promise<void> {
        this.events.push(event);
    }
}

/** Create middleware that records sanitized update, timing, and Telegram API debug events. */
export function devtools<C extends DevtoolsContext = DevtoolsContext>(
    options: DevtoolsOptions<C> = {}
): DevtoolsMiddleware<C> {
    const sink = resolveSink(options);
    const clock = options.clock ?? Date.now;

    return async (ctx, next) => {
        if (!(await shouldCapture(ctx, options))) {
            await next();
            return;
        }

        const previousDevtools = ctx.devtools;
        const originalCallApi = ctx.client.callApi.bind(ctx.client);
        const session = new DevtoolsSessionImpl(ctx, sink, options, clock);
        const updateStart = clock();

        ctx.devtools = session;

        await session.record({
            type: 'update',
            update: sanitizeValue(ctx.update ?? {}, options),
        });

        ctx.client.callApi = async (method: string, data?: Record<string, unknown>) => {
            const apiStart = clock();

            try {
                const response = await originalCallApi(method, data);
                await session.record(compactEvent({
                    type: 'api',
                    method,
                    ok: true,
                    durationMs: clock() - apiStart,
                    request: sanitizeValue(data ?? {}, options),
                    response: options.includeApiResult
                        ? sanitizeValue(response, options)
                        : undefined,
                }));
                return response;
            } catch (error) {
                await session.record({
                    type: 'api',
                    method,
                    ok: false,
                    durationMs: clock() - apiStart,
                    request: sanitizeValue(data ?? {}, options),
                    error: sanitizeError(error),
                });
                throw error;
            }
        };

        try {
            await next();
        } catch (error) {
            await session.record({
                type: 'error',
                error: sanitizeError(error),
            });
            throw error;
        } finally {
            await session.record({
                type: 'timing',
                name: 'update',
                durationMs: clock() - updateStart,
            });
            ctx.client.callApi = originalCallApi;
            if (previousDevtools) {
                ctx.devtools = previousDevtools;
            } else {
                delete ctx.devtools;
            }
        }
    };
}

/** Wrap one middleware in a named devtools timing span. */
export function withDevtoolsTiming<C extends DevtoolsContext>(
    name: string,
    middleware: DevtoolsMiddleware<C>
): DevtoolsMiddleware<C> {
    return async (ctx, next) => {
        if (!ctx.devtools) {
            await middleware(ctx, next);
            return;
        }

        await ctx.devtools.time(name, () => middleware(ctx, next));
    };
}

/** Create a sink that appends one JSON object per line to a local file. */
export function createJsonlSink(filePath: string): DevtoolsSink {
    return {
        async write(event) {
            await mkdir(dirname(filePath), { recursive: true });
            await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
        },
    };
}

/** Create a sink that writes JSON events to `console.log`. */
export function createConsoleSink(
    logger: Pick<Console, 'log'> = console
): DevtoolsSink {
    return {
        write(event) {
            logger.log(JSON.stringify(event));
        },
    };
}

/** Return a sanitized update fixture that can be committed to tests or replay files. */
export function createReplayFixture(
    update: DevtoolsUpdate,
    options: ReplayOptions = {}
): DevtoolsUpdate {
    if (options.sanitize === false) {
        return clonePlain(update) as DevtoolsUpdate;
    }

    return sanitizeValue(update, options) as DevtoolsUpdate;
}

/** Replay update fixtures against a bot-like target or an update handler function. */
export async function replayUpdates(
    target: ReplayTarget,
    updates: readonly DevtoolsUpdate[],
    options: ReplayOptions = {}
): Promise<void> {
    for (const update of updates) {
        const fixture = createReplayFixture(update, options);
        if (typeof target === 'function') {
            await target(fixture);
        } else {
            await target.handleUpdate(fixture);
        }
    }
}

/** Read update fixtures from a JSONL event file produced by `createJsonlSink()`. */
export async function readJsonlReplay(filePath: string): Promise<DevtoolsUpdate[]> {
    const raw = await readFile(filePath, 'utf8');
    return raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line) as DevtoolsLogEvent)
        .filter(event => event.type === 'update' && isRecord(event.update))
        .map(event => event.update as DevtoolsUpdate);
}

/** Replay update events from a JSONL file produced by the devtools sink. */
export async function replayJsonl(
    target: ReplayTarget,
    filePath: string,
    options: ReplayOptions = {}
): Promise<void> {
    await replayUpdates(target, await readJsonlReplay(filePath), options);
}

/** Deeply clone and redact sensitive keys from arbitrary update or API data. */
export function sanitizeValue(value: unknown, options: SanitizerOptions | readonly string[] = {}): unknown {
    const normalized = normalizeSanitizerOptions(options);
    return sanitizeDeep(value, normalized, 0, new WeakSet<object>());
}

class DevtoolsSessionImpl implements DevtoolsSession {
    readonly updateId: number | undefined;

    constructor(
        private readonly ctx: DevtoolsContext,
        private readonly sink: DevtoolsSink,
        private readonly options: DevtoolsSessionOptions,
        private readonly clock: DevtoolsClock
    ) {
        this.updateId = typeof ctx.update?.update_id === 'number' ? ctx.update.update_id : undefined;
    }

    async time<T>(name: string, fn: () => MaybePromise<T>): Promise<T> {
        const startedAt = this.clock();
        try {
            return await fn();
        } finally {
            await this.record({
                type: 'timing',
                name,
                durationMs: this.clock() - startedAt,
            });
        }
    }

    async record(event: DevtoolsLogEvent): Promise<void> {
        const fullEvent: DevtoolsLogEvent = {
            ...extractMeta(this.ctx),
            ...event,
            type: event.type,
            timestamp: event.timestamp ?? new Date().toISOString(),
        };

        await safeWrite(this.sink, fullEvent, Boolean(this.options.failOnSinkError));
    }
}

async function shouldCapture<C extends DevtoolsContext>(
    ctx: C,
    options: DevtoolsOptions<C>
): Promise<boolean> {
    if (typeof options.capture === 'function') {
        return Boolean(await options.capture(ctx));
    }
    if (typeof options.capture === 'boolean') {
        return options.capture;
    }

    return (options.env ?? process.env.NODE_ENV) !== 'production';
}

function resolveSink(options: DevtoolsSinkOptions): DevtoolsSink {
    if (options.sink) return options.sink;
    if (options.jsonlPath) return createJsonlSink(options.jsonlPath);
    return createConsoleSink();
}

async function safeWrite(
    sink: DevtoolsSink,
    event: DevtoolsLogEvent,
    failOnSinkError: boolean
): Promise<void> {
    try {
        await sink.write(event);
    } catch (error) {
        if (failOnSinkError) {
            throw error;
        }
    }
}

function sanitizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        };
    }

    return {
        message: String(error),
    };
}

function sanitizeDeep(
    value: unknown,
    options: Required<SanitizerOptions>,
    depth: number,
    seen: WeakSet<object>
): unknown {
    if (depth > options.maxDepth) {
        return '[MaxDepth]';
    }

    if (value === null || value === undefined) {
        return value;
    }

    const valueType = typeof value;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        return value;
    }
    if (valueType === 'bigint') {
        return value.toString();
    }
    if (valueType === 'function') {
        return '[Function]';
    }
    if (valueType !== 'object') {
        return String(value);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value instanceof Error) {
        return sanitizeError(value);
    }

    if (seen.has(value)) {
        return '[Circular]';
    }
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(entry => sanitizeDeep(entry, options, depth + 1, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (options.redact.includes(key.toLowerCase())) {
            result[key] = options.replacement;
        } else {
            result[key] = sanitizeDeep(entry, options, depth + 1, seen);
        }
    }

    return result;
}

function normalizeSanitizerOptions(
    options: SanitizerOptions | readonly string[]
): Required<SanitizerOptions> {
    const isList = isRedactList(options);
    const extraRedactions = isList ? options : options.redact ?? [];
    const replacement = isList
        ? DEFAULT_REPLACEMENT
        : options.replacement ?? DEFAULT_REPLACEMENT;
    const maxDepth = isList
        ? DEFAULT_MAX_DEPTH
        : options.maxDepth ?? DEFAULT_MAX_DEPTH;

    return {
        redact: Array.from(new Set([...DEFAULT_REDACT_KEYS, ...extraRedactions].map(key => key.toLowerCase()))),
        replacement,
        maxDepth,
    };
}

function extractMeta(ctx: DevtoolsContext): Record<string, unknown> {
    return compactRecord({
        updateId: ctx.update?.update_id,
        chatId: ctx.chat?.id,
        fromId: ctx.from?.id,
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

function compactEvent(event: DevtoolsLogEvent): DevtoolsLogEvent {
    const result: DevtoolsLogEvent = { type: event.type };

    for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }

    return result;
}

function clonePlain(value: unknown): unknown {
    return sanitizeDeep(value, {
        redact: [],
        replacement: DEFAULT_REPLACEMENT,
        maxDepth: DEFAULT_MAX_DEPTH,
    }, 0, new WeakSet<object>());
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRedactList(value: SanitizerOptions | readonly string[]): value is readonly string[] {
    return Array.isArray(value);
}
