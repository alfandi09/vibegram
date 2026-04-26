import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as https from 'https';
import { NetworkError, RateLimitError, TelegramApiError } from './errors';

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_JSON_PAYLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_NETWORK_RETRIES = 0;
const DEFAULT_NETWORK_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_NETWORK_RETRY_MAX_DELAY_MS = 5000;

type UploadValue = Buffer | NodeJS.ReadableStream;

interface MultipartAttachment {
    name: string;
    value: UploadValue;
}

function isUploadValue(value: unknown): value is UploadValue {
    return (
        Buffer.isBuffer(value) ||
        (typeof value === 'object' &&
            value !== null &&
            typeof (value as NodeJS.ReadableStream).pipe === 'function')
    );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function hasUploadValue(value: unknown, visited: WeakSet<object> = new WeakSet()): boolean {
    if (isUploadValue(value)) return true;
    if (typeof value !== 'object' || value === null) return false;
    if (visited.has(value)) return false;

    visited.add(value);

    if (Array.isArray(value)) {
        return value.some(item => hasUploadValue(item, visited));
    }

    return Object.values(value).some(item => hasUploadValue(item, visited));
}

function validatePayloadValue(
    value: unknown,
    path: string,
    visited: WeakSet<object> = new WeakSet()
): void {
    if (
        value === undefined ||
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return;
    }

    if (isUploadValue(value)) return;

    if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
        throw new TypeError(`Telegram API payload contains unsupported value at ${path}.`);
    }

    if (typeof value !== 'object') return;

    if (visited.has(value)) {
        throw new TypeError('Telegram API payload contains a circular reference.');
    }

    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => validatePayloadValue(item, `${path}[${index}]`, visited));
        visited.delete(value);
        return;
    }

    if (!isPlainObject(value)) {
        throw new TypeError(
            `Telegram API payload must contain only plain objects; ${path} is not plain.`
        );
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        validatePayloadValue(nestedValue, `${path}.${key}`, visited);
    }

    visited.delete(value);
}

function validateRequestPayload(data: unknown, maxJsonPayloadBytes: number): void {
    if (data === undefined) return;

    if (!isPlainObject(data)) {
        throw new TypeError('Telegram API payload must be a plain object when provided.');
    }

    validatePayloadValue(data, 'data');

    if (hasUploadValue(data)) return;

    const json = JSON.stringify(data);
    const byteLength = Buffer.byteLength(json, 'utf8');
    if (byteLength > maxJsonPayloadBytes) {
        throw new RangeError(
            `Telegram API JSON payload exceeds maximum size of ${maxJsonPayloadBytes} bytes.`
        );
    }
}

function makeAttachmentName(path: Array<string | number>, usedNames: Set<string>): string {
    const baseName =
        path
            .map(segment => String(segment).replace(/[^a-zA-Z0-9_]+/g, '_'))
            .filter(Boolean)
            .join('_') || 'file';

    let candidate = baseName;
    let suffix = 1;
    while (usedNames.has(candidate)) {
        candidate = `${baseName}_${suffix}`;
        suffix++;
    }

    usedNames.add(candidate);
    return candidate;
}

function serializeMultipartValue(
    value: unknown,
    path: Array<string | number>,
    attachments: MultipartAttachment[],
    usedNames: Set<string>,
    visited: WeakSet<object> = new WeakSet()
): unknown {
    if (isUploadValue(value)) {
        const attachmentName = makeAttachmentName(path, usedNames);
        attachments.push({ name: attachmentName, value });
        return `attach://${attachmentName}`;
    }

    if (Array.isArray(value)) {
        return value.map((item, index) =>
            serializeMultipartValue(item, [...path, index], attachments, usedNames, visited)
        );
    }

    if (typeof value !== 'object' || value === null) {
        return value;
    }

    if (visited.has(value)) {
        throw new TypeError('Telegram API payload contains a circular reference.');
    }

    visited.add(value);

    const serialized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
        if (nestedValue !== undefined) {
            serialized[key] = serializeMultipartValue(
                nestedValue,
                [...path, key],
                attachments,
                usedNames,
                visited
            );
        }
    }

    visited.delete(value);
    return serialized;
}

function prepareRequestPayload(data: unknown): {
    reqData: unknown;
    headers: Record<string, string>;
    isMultipart: boolean;
} {
    if (typeof data !== 'object' || data === null || !hasUploadValue(data)) {
        return {
            reqData: data,
            headers: {},
            isMultipart: false,
        };
    }

    const form = new FormData();
    const attachments: MultipartAttachment[] = [];
    const usedNames = new Set<string>();

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;

        if (isUploadValue(value)) {
            form.append(key, value);
            continue;
        }

        if (typeof value === 'object' && value !== null) {
            const serialized = serializeMultipartValue(value, [key], attachments, usedNames);
            form.append(key, JSON.stringify(serialized));
            continue;
        }

        form.append(key, value);
    }

    for (const attachment of attachments) {
        form.append(attachment.name, attachment.value);
    }

    return {
        reqData: form,
        headers: form.getHeaders(),
        isMultipart: true,
    };
}

interface AxiosErrorLike {
    config?: {
        baseURL?: unknown;
        url?: unknown;
    };
    response?: {
        status?: unknown;
        data?: unknown;
        config?: {
            baseURL?: unknown;
            url?: unknown;
        };
    };
}

interface TelegramErrorPayload {
    error_code?: unknown;
    description?: unknown;
    parameters?: {
        retry_after?: unknown;
    };
}

function redactToken(value: unknown, token: string): unknown {
    if (typeof value !== 'string') return value;
    if (token.length === 0) return value;
    return value.split(token).join('[REDACTED]');
}

function sanitizeAxiosConfig(config: AxiosErrorLike['config'], token: string): void {
    if (!config) return;
    config.baseURL = redactToken(config.baseURL, token);
    config.url = redactToken(config.url, token);
}

function sanitizeAxiosError(error: unknown, token: string): void {
    if (typeof error !== 'object' || error === null) return;

    const axiosError = error as AxiosErrorLike;
    sanitizeAxiosConfig(axiosError.config, token);
    sanitizeAxiosConfig(axiosError.response?.config, token);

    if (error instanceof Error) {
        error.message = redactToken(error.message, token) as string;
    }
}

function getErrorMessage(error: unknown, token: string): string {
    const message = error instanceof Error ? error.message : 'Unknown request failure';
    return redactToken(message, token) as string;
}

function getErrorStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;

    const status = (error as AxiosErrorLike).response?.status;
    return typeof status === 'number' ? status : undefined;
}

function isRetryableNetworkError(error: unknown): boolean {
    const statusCode = getErrorStatusCode(error);
    return statusCode === undefined || statusCode >= 500;
}

function getTelegramErrorPayload(error: unknown): TelegramErrorPayload | undefined {
    if (typeof error !== 'object' || error === null) return undefined;

    const data = (error as AxiosErrorLike).response?.data;
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return undefined;
    }

    return data as TelegramErrorPayload;
}

function getRetryAfterSeconds(payload: TelegramErrorPayload | undefined): number {
    const retryAfter = payload?.parameters?.retry_after;
    return typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : 1;
}

function getTelegramErrorCode(payload: TelegramErrorPayload, fallbackStatusCode?: number): number {
    return typeof payload.error_code === 'number' ? payload.error_code : (fallbackStatusCode ?? 0);
}

function getTelegramErrorDescription(payload: TelegramErrorPayload): string {
    return typeof payload.description === 'string'
        ? payload.description
        : 'Telegram request failed';
}

function validateNonNegativeIntegerOption(name: string, value: number): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${name} must be a non-negative integer.`);
    }
}

function validateNonNegativeNumberOption(name: string, value: number): void {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${name} must be a non-negative number.`);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface TelegramClientRequestEvent {
    method: string;
    attempt: number;
    isMultipart: boolean;
}

export interface TelegramClientSuccessEvent extends TelegramClientRequestEvent {
    durationMs: number;
}

export interface TelegramClientErrorEvent extends TelegramClientRequestEvent {
    durationMs: number;
    error: unknown;
    statusCode?: number;
}

export interface TelegramClientRetryEvent extends TelegramClientErrorEvent {
    retryAfter: number;
    remainingRetries: number;
}

export interface TelegramClientNetworkRetryEvent extends TelegramClientErrorEvent {
    retryAfterMs: number;
    remainingRetries: number;
}

export interface TelegramClientHooks {
    onRequestStart?: (event: TelegramClientRequestEvent) => void | Promise<void>;
    onRequestSuccess?: (event: TelegramClientSuccessEvent) => void | Promise<void>;
    onRequestError?: (event: TelegramClientErrorEvent) => void | Promise<void>;
    onRateLimitRetry?: (event: TelegramClientRetryEvent) => void | Promise<void>;
    onNetworkRetry?: (event: TelegramClientNetworkRetryEvent) => void | Promise<void>;
}

export interface TelegramClientOptions {
    hooks?: TelegramClientHooks;
    /**
     * Maximum JSON payload size in bytes for non-multipart requests.
     * Multipart uploads are streamed/form-encoded and are not measured with this limit.
     * Defaults to 50MB.
     */
    maxJsonPayloadBytes?: number;
    /**
     * Number of retries for transient network failures and HTTP 5xx responses.
     * HTTP 4xx client errors and Telegram rate-limit responses are never retried here.
     * Defaults to 0 to avoid duplicate non-idempotent Bot API calls unless explicitly enabled.
     */
    networkRetries?: number;
    /**
     * Initial delay in milliseconds for network retries. Each retry doubles the delay.
     * Defaults to 500ms.
     */
    networkRetryBaseDelayMs?: number;
    /**
     * Maximum network retry delay in milliseconds.
     * Defaults to 5000ms.
     */
    networkRetryMaxDelayMs?: number;
}

export class TelegramClient {
    private http: AxiosInstance;
    private readonly _token: string;
    private readonly hooks?: TelegramClientHooks;
    private readonly maxJsonPayloadBytes: number;
    private readonly networkRetries: number;
    private readonly networkRetryBaseDelayMs: number;
    private readonly networkRetryMaxDelayMs: number;

    constructor(token: string, options?: TelegramClientOptions) {
        this._token = token;
        this.hooks = options?.hooks;
        this.maxJsonPayloadBytes = options?.maxJsonPayloadBytes ?? DEFAULT_MAX_JSON_PAYLOAD_BYTES;
        this.networkRetries = options?.networkRetries ?? DEFAULT_NETWORK_RETRIES;
        this.networkRetryBaseDelayMs =
            options?.networkRetryBaseDelayMs ?? DEFAULT_NETWORK_RETRY_BASE_DELAY_MS;
        this.networkRetryMaxDelayMs =
            options?.networkRetryMaxDelayMs ?? DEFAULT_NETWORK_RETRY_MAX_DELAY_MS;

        if (!Number.isFinite(this.maxJsonPayloadBytes) || this.maxJsonPayloadBytes <= 0) {
            throw new TypeError('maxJsonPayloadBytes must be a positive number.');
        }
        validateNonNegativeIntegerOption('networkRetries', this.networkRetries);
        validateNonNegativeNumberOption('networkRetryBaseDelayMs', this.networkRetryBaseDelayMs);
        validateNonNegativeNumberOption('networkRetryMaxDelayMs', this.networkRetryMaxDelayMs);

        // Keep-Alive agent prevents repeated TCP/TLS handshakes in high-traffic environments.
        const agent = new https.Agent({ keepAlive: true, maxSockets: 100 });

        this.http = axios.create({
            baseURL: `https://api.telegram.org/bot${this._token}/`,
            timeout: 50000, // 50s accommodates the long-polling window (30-40s) without premature ETIMEDOUT.
            httpsAgent: agent,
        });

        this.http.interceptors.response.use(undefined, error => {
            sanitizeAxiosError(error, this._token);
            return Promise.reject(error);
        });
    }

    /**
     * Internal token accessor — used only for file downloads and WebApp validation.
     * Not exposed to library consumers.
     */
    get token(): string {
        return this._token;
    }

    private async invokeHook(name: string, hook?: () => void | Promise<void>): Promise<void> {
        if (!hook) return;

        try {
            await hook();
        } catch (error) {
            console.error(`[VibeGram] TelegramClient ${name} hook error:`, error);
        }
    }

    private getNetworkRetryDelayMs(remainingRetries: number): number {
        if (this.networkRetryBaseDelayMs === 0 || this.networkRetryMaxDelayMs === 0) {
            return 0;
        }

        const retryNumber = this.networkRetries - remainingRetries + 1;
        const exponent = Math.min(retryNumber - 1, 30);
        const delay = this.networkRetryBaseDelayMs * 2 ** exponent;
        return Math.min(delay, this.networkRetryMaxDelayMs);
    }

    private async callApiAttempt(
        method: string,
        data: unknown,
        rateLimitRetries: number,
        networkRetries: number,
        attempt: number
    ): Promise<unknown> {
        const start = Date.now();
        validateRequestPayload(data, this.maxJsonPayloadBytes);
        const { reqData, headers, isMultipart } = prepareRequestPayload(data);

        try {
            await this.invokeHook('onRequestStart', () =>
                this.hooks?.onRequestStart?.({ method, attempt, isMultipart })
            );

            const response = await this.http.post(method, reqData, { headers });
            const result = response.data;
            if (!result.ok) {
                throw new TelegramApiError(
                    `Telegram request failed: [${result.error_code}] ${result.description}`,
                    result.error_code,
                    result.description
                );
            }

            await this.invokeHook('onRequestSuccess', () =>
                this.hooks?.onRequestSuccess?.({
                    method,
                    attempt,
                    isMultipart,
                    durationMs: Date.now() - start,
                })
            );

            return result.result;
        } catch (error: unknown) {
            sanitizeAxiosError(error, this._token);

            if (
                error instanceof TelegramApiError ||
                error instanceof NetworkError ||
                error instanceof RateLimitError
            ) {
                await this.invokeHook('onRequestError', () =>
                    this.hooks?.onRequestError?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error,
                    })
                );
                throw error;
            }

            const statusCode = getErrorStatusCode(error);
            const telegramErrorPayload = getTelegramErrorPayload(error);

            // Handle Rate Limiting (429 Too Many Requests) with auto-retry.
            if (statusCode === 429 && rateLimitRetries > 0) {
                const retryAfter = getRetryAfterSeconds(telegramErrorPayload);
                await this.invokeHook('onRateLimitRetry', () =>
                    this.hooks?.onRateLimitRetry?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error,
                        statusCode: 429,
                        retryAfter,
                        remainingRetries: rateLimitRetries,
                    })
                );
                console.warn(`[Rate Limit] Telegram quota exceeded. Retrying in ${retryAfter}s...`);
                await sleep(retryAfter * 1000);
                return this.callApiAttempt(
                    method,
                    data,
                    rateLimitRetries - 1,
                    networkRetries,
                    attempt + 1
                );
            }

            if (networkRetries > 0 && isRetryableNetworkError(error)) {
                const retryAfterMs = this.getNetworkRetryDelayMs(networkRetries);
                await this.invokeHook('onNetworkRetry', () =>
                    this.hooks?.onNetworkRetry?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error,
                        statusCode,
                        retryAfterMs,
                        remainingRetries: networkRetries - 1,
                    })
                );
                await sleep(retryAfterMs);
                return this.callApiAttempt(
                    method,
                    data,
                    rateLimitRetries,
                    networkRetries - 1,
                    attempt + 1
                );
            }

            if (telegramErrorPayload) {
                const errorCode = getTelegramErrorCode(telegramErrorPayload, statusCode);
                const description = getTelegramErrorDescription(telegramErrorPayload);
                const typedError =
                    statusCode === 429
                        ? new RateLimitError(getRetryAfterSeconds(telegramErrorPayload))
                        : new TelegramApiError(
                              `Telegram request failed: [${errorCode}] ${description}`,
                              errorCode,
                              description
                          );

                await this.invokeHook('onRequestError', () =>
                    this.hooks?.onRequestError?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error: typedError,
                        statusCode,
                    })
                );

                if (statusCode === 429) {
                    throw typedError;
                }

                throw typedError;
            }

            const networkError = new NetworkError(
                `Network Error: ${getErrorMessage(error, this._token)}`,
                error instanceof Error ? error : undefined
            );

            await this.invokeHook('onRequestError', () =>
                this.hooks?.onRequestError?.({
                    method,
                    attempt,
                    isMultipart,
                    durationMs: Date.now() - start,
                    error: networkError,
                })
            );

            throw networkError;
        }
    }

    /**
     * Calls a Telegram Bot API method with automatic multipart/form-data delegation
     * plus rate-limit and optional network retry handling.
     */
    async callApi(method: string, data?: any, retries: number = 3): Promise<any> {
        return this.callApiAttempt(method, data, retries, this.networkRetries, 1);
    }

    /**
     * Returns a direct download URL for a file stored on Telegram servers by file_id.
     */
    async getFileLink(fileId: string): Promise<string> {
        const file = await this.callApi('getFile', { file_id: fileId });
        return `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
    }

    /**
     * Downloads a file from Telegram — either streams it to a local path or returns it as a Buffer.
     */
    async downloadFile(fileId: string, destPath?: string): Promise<Buffer | void> {
        const url = await this.getFileLink(fileId);
        const response = await axios.get(url, {
            responseType: destPath ? 'stream' : 'arraybuffer',
            timeout: DEFAULT_DOWNLOAD_TIMEOUT_MS,
            maxContentLength: DEFAULT_MAX_DOWNLOAD_BYTES,
            maxBodyLength: DEFAULT_MAX_DOWNLOAD_BYTES,
        });

        const contentLengthHeader = response.headers?.['content-length'];
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength) && contentLength > DEFAULT_MAX_DOWNLOAD_BYTES) {
            throw new NetworkError(
                `Download exceeds maximum size of ${DEFAULT_MAX_DOWNLOAD_BYTES} bytes.`
            );
        }

        if (destPath) {
            return new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(destPath);
                const stream = response.data as NodeJS.ReadableStream;
                let settled = false;

                const fail = (err: Error) => {
                    if (settled) return;
                    settled = true;
                    writer.destroy();
                    fs.promises
                        .unlink(destPath)
                        .catch(() => undefined)
                        .finally(() => {
                            reject(new NetworkError(`Download failed: ${err.message}`, err));
                        });
                };

                stream.on('error', fail);
                response.data.pipe(writer);
                writer.on('finish', () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                });
                writer.on('error', fail);
            });
        }
        return Buffer.from(response.data);
    }
}
