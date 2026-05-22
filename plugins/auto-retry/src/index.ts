export interface TelegramClientRequest {
    method: string;
    data?: unknown;
    retries: number;
    networkRetries: number;
}

export type TelegramClientNext = (request: TelegramClientRequest) => Promise<unknown>;
export type TelegramClientTransformer = (next: TelegramClientNext) => TelegramClientNext;

export type AutoRetryReason = 'rate-limit' | 'network' | 'server-error';

export interface AutoRetryErrorInfo {
    name: string;
    message: string;
    errorCode?: number;
    retryAfter?: number;
}

export interface AutoRetryEvent {
    method: string;
    retryAttempt: number;
    maxRetries: number;
    reason: AutoRetryReason;
    delayMs: number;
    error: AutoRetryErrorInfo;
}

export interface AutoRetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    maxRetryAfterMs?: number;
    jitter?: boolean | number;
    includeMethods?: readonly string[];
    excludeMethods?: readonly string[];
    retryNonIdempotentMethods?: boolean;
    redact?: readonly (string | RegExp)[];
    onRetry?: (event: AutoRetryEvent) => void | Promise<void>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;
const DEFAULT_JITTER_RATIO = 0.2;
const TELEGRAM_TOKEN_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g;

interface NormalizedAutoRetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    maxRetryAfterMs: number;
    jitterRatio: number;
    includeMethods?: ReadonlySet<string>;
    excludeMethods?: ReadonlySet<string>;
    retryNonIdempotentMethods: boolean;
    redact: readonly (string | RegExp)[];
    onRetry?: (event: AutoRetryEvent) => void | Promise<void>;
}

interface RetryDecision {
    reason: AutoRetryReason;
    delayMs: number;
}

export function autoRetry(options: AutoRetryOptions = {}): TelegramClientTransformer {
    const normalized = normalizeOptions(options);

    return next => async request => {
        if (!shouldHandleMethod(request.method, normalized)) {
            return next(request);
        }

        const retryRequest: TelegramClientRequest = {
            ...request,
            retries: 0,
            networkRetries: 0,
        };
        let retriesUsed = 0;

        while (true) {
            try {
                return await next(retryRequest);
            } catch (error) {
                const decision = getRetryDecision(error, retriesUsed, normalized);

                if (!decision || retriesUsed >= normalized.maxRetries) {
                    throw error;
                }

                const retryAttempt = retriesUsed + 1;
                await callRetryHook(normalized, {
                    method: request.method,
                    retryAttempt,
                    maxRetries: normalized.maxRetries,
                    reason: decision.reason,
                    delayMs: decision.delayMs,
                    error: toErrorInfo(error, normalized.redact),
                });
                await sleep(decision.delayMs);
                retriesUsed = retryAttempt;
            }
        }
    };
}

function normalizeOptions(options: AutoRetryOptions): NormalizedAutoRetryOptions {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    const maxRetryAfterMs = options.maxRetryAfterMs ?? Number.POSITIVE_INFINITY;

    validateNonNegativeInteger('maxRetries', maxRetries);
    validateNonNegativeNumber('baseDelayMs', baseDelayMs);
    validateNonNegativeNumber('maxDelayMs', maxDelayMs);
    validateNonNegativeNumber('maxRetryAfterMs', maxRetryAfterMs);

    return {
        maxRetries,
        baseDelayMs,
        maxDelayMs,
        maxRetryAfterMs,
        jitterRatio: normalizeJitter(options.jitter),
        includeMethods: options.includeMethods ? new Set(options.includeMethods) : undefined,
        excludeMethods: options.excludeMethods ? new Set(options.excludeMethods) : undefined,
        retryNonIdempotentMethods: options.retryNonIdempotentMethods ?? true,
        redact: options.redact ?? [TELEGRAM_TOKEN_PATTERN],
        onRetry: options.onRetry,
    };
}

function validateNonNegativeInteger(name: string, value: number): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${name} must be a non-negative integer.`);
    }
}

function validateNonNegativeNumber(name: string, value: number): void {
    if ((!Number.isFinite(value) && value !== Number.POSITIVE_INFINITY) || value < 0) {
        throw new TypeError(`${name} must be a non-negative number.`);
    }
}

function normalizeJitter(jitter: boolean | number | undefined): number {
    if (jitter === undefined || jitter === true) {
        return DEFAULT_JITTER_RATIO;
    }

    if (jitter === false) {
        return 0;
    }

    if (!Number.isFinite(jitter) || jitter < 0 || jitter > 1) {
        throw new TypeError('jitter must be a boolean or a number between 0 and 1.');
    }

    return jitter;
}

function shouldHandleMethod(method: string, options: NormalizedAutoRetryOptions): boolean {
    if (options.includeMethods && !options.includeMethods.has(method)) {
        return false;
    }

    if (options.excludeMethods?.has(method)) {
        return false;
    }

    if (!options.retryNonIdempotentMethods && !isIdempotentMethod(method)) {
        return false;
    }

    return true;
}

function isIdempotentMethod(method: string): boolean {
    return method.startsWith('get');
}

function getRetryDecision(
    error: unknown,
    retriesUsed: number,
    options: NormalizedAutoRetryOptions
): RetryDecision | undefined {
    const retryAfter = getRetryAfter(error);

    if (retryAfter !== undefined) {
        const delayMs = retryAfter * 1000;
        if (delayMs > options.maxRetryAfterMs) {
            return undefined;
        }

        return {
            reason: 'rate-limit',
            delayMs,
        };
    }

    if (isNetworkError(error)) {
        return {
            reason: 'network',
            delayMs: getBackoffDelayMs(retriesUsed, options),
        };
    }

    if (isServerError(error)) {
        return {
            reason: 'server-error',
            delayMs: getBackoffDelayMs(retriesUsed, options),
        };
    }

    return undefined;
}

function getRetryAfter(error: unknown): number | undefined {
    const record = readRecord(error);
    const retryAfter = record?.retryAfter;

    return typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : undefined;
}

function isNetworkError(error: unknown): boolean {
    return readErrorName(error) === 'NetworkError';
}

function isServerError(error: unknown): boolean {
    const record = readRecord(error);
    const errorCode = record?.errorCode;

    return readErrorName(error) === 'TelegramApiError' && typeof errorCode === 'number'
        ? errorCode >= 500
        : false;
}

function readErrorName(error: unknown): string | undefined {
    const record = readRecord(error);
    const name = record?.name;

    return typeof name === 'string' ? name : undefined;
}

function getBackoffDelayMs(retriesUsed: number, options: NormalizedAutoRetryOptions): number {
    const exponent = Math.min(retriesUsed, 30);
    const baseDelay = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** exponent);

    if (options.jitterRatio === 0 || baseDelay === 0) {
        return baseDelay;
    }

    const spread = baseDelay * options.jitterRatio;
    const min = Math.max(0, baseDelay - spread);
    const max = baseDelay + spread;
    return Math.round(min + Math.random() * (max - min));
}

async function callRetryHook(
    options: NormalizedAutoRetryOptions,
    event: AutoRetryEvent
): Promise<void> {
    try {
        await options.onRetry?.(event);
    } catch {
        // Retry hooks are for observability and must not change request outcome.
    }
}

function toErrorInfo(error: unknown, redactors: readonly (string | RegExp)[]): AutoRetryErrorInfo {
    const record = readRecord(error);
    const message =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown retryable error';
    const errorCode = record?.errorCode;
    const retryAfter = record?.retryAfter;

    return {
        name: readErrorName(error) ?? 'Error',
        message: redact(message, redactors),
        errorCode: typeof errorCode === 'number' ? errorCode : undefined,
        retryAfter: typeof retryAfter === 'number' ? retryAfter : undefined,
    };
}

function redact(value: string, redactors: readonly (string | RegExp)[]): string {
    let result = value;

    for (const redactor of redactors) {
        if (typeof redactor === 'string') {
            result = result.split(redactor).join('[REDACTED]');
            continue;
        }

        result = result.replace(redactor, '[REDACTED]');
    }

    return result;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

async function sleep(ms: number): Promise<void> {
    if (ms <= 0) {
        return;
    }

    await new Promise(resolve => setTimeout(resolve, ms));
}
