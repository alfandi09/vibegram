export type MaybePromise<T> = T | Promise<T>;
export type NextFunction = () => Promise<void>;

export interface ObservabilityClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface ObservabilityContext {
    update?: Record<string, unknown>;
    chat?: { id?: number | string; [key: string]: unknown };
    from?: { id?: number; [key: string]: unknown };
    client?: ObservabilityClient;
    observability?: ObservabilitySession;
    [key: string]: unknown;
}

export type ObservabilityMiddleware<C extends ObservabilityContext = ObservabilityContext> = (
    ctx: C,
    next: NextFunction
) => Promise<void>;

export type ObservabilityFlavor<C> = C & {
    observability?: ObservabilitySession;
};

export type ObservabilityMetric =
    | UpdateDurationMetric
    | ApiDurationMetric
    | ErrorCountMetric
    | CustomMetric;

export interface BaseMetric {
    type: string;
    timestamp?: string;
    [key: string]: unknown;
}

export interface UpdateDurationMetric extends BaseMetric {
    type: 'update.duration';
    ok: boolean;
    durationMs: number;
    updateId?: number;
    updateType?: string;
    chatId?: number | string;
    fromId?: number;
}

export interface ApiDurationMetric extends BaseMetric {
    type: 'api.duration';
    ok: boolean;
    method: string;
    durationMs: number;
    updateId?: number;
    chatId?: number | string;
    fromId?: number;
    error?: Record<string, unknown>;
}

export interface ErrorCountMetric extends BaseMetric {
    type: 'error.count';
    source: 'middleware' | 'api';
    count: 1;
    updateId?: number;
    chatId?: number | string;
    fromId?: number;
    method?: string;
    error: Record<string, unknown>;
}

export interface CustomMetric extends BaseMetric {
    type: string;
}

export interface MetricSink {
    write(metric: ObservabilityMetric): MaybePromise<void>;
}

export interface ObservabilitySession {
    readonly updateId: number | undefined;
    record(metric: ObservabilityMetric): Promise<void>;
}

export interface ObservabilityLogger {
    info?(entry: Record<string, unknown>): MaybePromise<void>;
    warn?(entry: Record<string, unknown>): MaybePromise<void>;
    error?(entry: Record<string, unknown>): MaybePromise<void>;
    log?(entry: Record<string, unknown>): MaybePromise<void>;
}

export interface OpenTelemetryHooks {
    recordMetric?(metric: ObservabilityMetric): MaybePromise<void>;
}

export interface SentryHooks {
    captureException?(error: unknown, context?: Record<string, unknown>): MaybePromise<void>;
}

export interface RedactOptions {
    redact?: readonly string[];
    replacement?: string;
    maxDepth?: number;
}

export interface ObservabilityOptions extends RedactOptions {
    sink?: MetricSink;
    onMetric?: (metric: ObservabilityMetric) => MaybePromise<void>;
    logger?: ObservabilityLogger;
    openTelemetry?: OpenTelemetryHooks;
    sentry?: SentryHooks;
    clock?: () => number;
    now?: () => Date;
    includeLogs?: boolean;
    failOnObserverError?: boolean;
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
const TELEGRAM_TOKEN_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/g;

/** In-memory metric sink for tests and local instrumentation. */
export class MemoryMetricSink implements MetricSink {
    readonly events: ObservabilityMetric[] = [];

    async write(metric: ObservabilityMetric): Promise<void> {
        this.events.push(metric);
    }
}

/** Add update, Telegram API, and error telemetry around one VibeGram middleware chain. */
export function observability<C extends ObservabilityContext = ObservabilityContext>(
    options: ObservabilityOptions = {}
): ObservabilityMiddleware<C> {
    const clock = options.clock ?? Date.now;
    const now = options.now ?? (() => new Date());

    return async (ctx, next) => {
        const previousSession = ctx.observability;
        const previousCallApi = ctx.client?.callApi;
        const callApi = previousCallApi?.bind(ctx.client);
        const session = new ObservabilitySessionImpl(ctx, options, now);
        const updateStart = clock();
        let ok = false;

        ctx.observability = session;

        if (ctx.client && previousCallApi && callApi) {
            ctx.client.callApi = async (method: string, data?: Record<string, unknown>) => {
                const apiStart = clock();

                try {
                    const result = await callApi(method, data);
                    await session.record({
                        ...extractMeta(ctx),
                        type: 'api.duration',
                        ok: true,
                        method,
                        durationMs: clock() - apiStart,
                    });
                    return result;
                } catch (error) {
                    const safeError = redactError(error, options);
                    await session.record({
                        ...extractMeta(ctx),
                        type: 'api.duration',
                        ok: false,
                        method,
                        durationMs: clock() - apiStart,
                        error: safeError,
                    });
                    await session.record({
                        ...extractMeta(ctx),
                        type: 'error.count',
                        source: 'api',
                        count: 1,
                        method,
                        error: safeError,
                    });
                    throw error;
                }
            };
        }

        try {
            await next();
            ok = true;
        } catch (error) {
            const safeError = redactError(error, options);
            await session.record({
                ...extractMeta(ctx),
                type: 'error.count',
                source: 'middleware',
                count: 1,
                error: safeError,
            });
            await safeLog(options, 'error', {
                event: 'vibegram.error',
                ...extractMeta(ctx),
                error: safeError,
            });
            await safeSentry(options, error, {
                ...extractMeta(ctx),
                error: safeError,
            });
            throw error;
        } finally {
            await session.record({
                ...extractMeta(ctx),
                type: 'update.duration',
                ok,
                durationMs: clock() - updateStart,
                updateType: getUpdateType(ctx.update),
            });

            if (ctx.client && previousCallApi) {
                ctx.client.callApi = previousCallApi;
            }
            if (previousSession) {
                ctx.observability = previousSession;
            } else {
                delete ctx.observability;
            }
        }
    };
}

/** Deeply redact sensitive keys and Telegram bot-token shaped strings. */
export function redactValue(value: unknown, options: RedactOptions = {}): unknown {
    const normalized = normalizeRedactOptions(options);
    return redactDeep(value, normalized, 0, new WeakSet<object>());
}

/** Convert unknown thrown values to safe error metadata without stack traces. */
export function redactError(error: unknown, options: RedactOptions = {}): Record<string, unknown> {
    const normalized = normalizeRedactOptions(options);

    if (error instanceof Error) {
        return {
            name: error.name,
            message: redactString(error.message, normalized),
        };
    }

    return {
        message: redactString(String(error), normalized),
    };
}

class ObservabilitySessionImpl implements ObservabilitySession {
    readonly updateId: number | undefined;

    constructor(
        private readonly ctx: ObservabilityContext,
        private readonly options: ObservabilityOptions,
        private readonly now: () => Date
    ) {
        this.updateId = typeof ctx.update?.update_id === 'number' ? ctx.update.update_id : undefined;
    }

    async record(metric: ObservabilityMetric): Promise<void> {
        const timestamped = redactValue({
            ...metric,
            timestamp: metric.timestamp ?? this.now().toISOString(),
        }, this.options) as ObservabilityMetric;

        await emitMetric(this.options, timestamped);
        await safeLog(this.options, metric.type === 'error.count' ? 'error' : 'info', {
            event: metric.type,
            metric: timestamped,
        });
    }
}

async function emitMetric(
    options: ObservabilityOptions,
    metric: ObservabilityMetric
): Promise<void> {
    await safeObserver(options, () => options.sink?.write(metric));
    await safeObserver(options, () => options.onMetric?.(metric));
    await safeObserver(options, () => options.openTelemetry?.recordMetric?.(metric));
}

async function safeLog(
    options: ObservabilityOptions,
    level: 'info' | 'warn' | 'error',
    entry: Record<string, unknown>
): Promise<void> {
    if (!options.logger) {
        return;
    }

    const safeEntry = redactValue(entry, options) as Record<string, unknown>;
    await safeObserver(options, async () => {
        const writer = options.logger?.[level] ?? options.logger?.log;
        await writer?.(safeEntry);
    });
}

async function safeSentry(
    options: ObservabilityOptions,
    error: unknown,
    context: Record<string, unknown>
): Promise<void> {
    await safeObserver(options, () => options.sentry?.captureException?.(error, context));
}

async function safeObserver(
    options: Pick<ObservabilityOptions, 'failOnObserverError'>,
    fn: () => MaybePromise<unknown>
): Promise<void> {
    try {
        await fn();
    } catch (error) {
        if (options.failOnObserverError) {
            throw error;
        }
    }
}

function extractMeta(ctx: ObservabilityContext): Record<string, unknown> {
    return compactRecord({
        updateId: ctx.update?.update_id,
        chatId: ctx.chat?.id,
        fromId: ctx.from?.id,
    });
}

function getUpdateType(update: Record<string, unknown> | undefined): string | undefined {
    if (!update) return undefined;
    return Object.keys(update).find(key => key !== 'update_id' && update[key] !== undefined);
}

interface NormalizedRedactOptions {
    redact: Set<string>;
    replacement: string;
    maxDepth: number;
}

function normalizeRedactOptions(options: RedactOptions): NormalizedRedactOptions {
    return {
        redact: new Set([...DEFAULT_REDACT_KEYS, ...(options.redact ?? [])].map(key => key.toLowerCase())),
        replacement: options.replacement ?? DEFAULT_REPLACEMENT,
        maxDepth: positiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, 'maxDepth'),
    };
}

function redactDeep(
    value: unknown,
    options: NormalizedRedactOptions,
    depth: number,
    seen: WeakSet<object>
): unknown {
    if (depth > options.maxDepth) {
        return '[MaxDepth]';
    }

    if (typeof value === 'string') {
        return redactString(value, options);
    }
    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (typeof value === 'function') {
        return '[Function]';
    }
    if (typeof value !== 'object') {
        return String(value);
    }
    if (value instanceof Error) {
        return redactError(value, {
            redact: Array.from(options.redact),
            replacement: options.replacement,
            maxDepth: options.maxDepth,
        });
    }
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (seen.has(value)) {
        return '[Circular]';
    }
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(entry => redactDeep(entry, options, depth + 1, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (options.redact.has(key.toLowerCase())) {
            result[key] = options.replacement;
        } else {
            result[key] = redactDeep(entry, options, depth + 1, seen);
        }
    }
    return result;
}

function redactString(value: string, options: NormalizedRedactOptions): string {
    return value.replace(TELEGRAM_TOKEN_PATTERN, options.replacement);
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

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`[vibegram/observability] ${name} must be a positive integer.`);
    }
    return value;
}
