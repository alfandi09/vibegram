import * as fs from 'fs';
import type { Readable } from 'stream';
import { NetworkError, RateLimitError, TelegramApiError } from './errors';
import { createHttpTransport, HttpRequestError, type HttpTransport } from './http';
import { prepareRequestPayload, validateRequestPayload } from './multipart';

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_JSON_PAYLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_NETWORK_RETRIES = 0;
const DEFAULT_NETWORK_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_NETWORK_RETRY_MAX_DELAY_MS = 5000;

function createDownloadLimitError(): NetworkError {
    return new NetworkError(`Download exceeds maximum size of ${DEFAULT_MAX_DOWNLOAD_BYTES} bytes.`);
}

function getChunkByteLength(chunk: unknown): number {
    if (typeof chunk === 'string') return Buffer.byteLength(chunk);
    if (chunk instanceof Uint8Array) return chunk.byteLength;
    if (chunk instanceof ArrayBuffer) return chunk.byteLength;
    return Buffer.byteLength(String(chunk));
}

interface HttpErrorLike {
    requestUrl?: unknown;
    response?: {
        status?: unknown;
        data?: unknown;
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

function sanitizeHttpError(error: unknown, token: string): void {
    if (typeof error !== 'object' || error === null) return;

    if (error instanceof HttpRequestError) {
        (error as HttpRequestError & { requestUrl: string }).requestUrl = redactToken(
            error.requestUrl,
            token
        ) as string;
    }

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

    if (error instanceof HttpRequestError) {
        return typeof error.status === 'number' ? error.status : undefined;
    }

    const status = (error as HttpErrorLike).response?.status;
    return typeof status === 'number' ? status : undefined;
}

function isRetryableNetworkError(error: unknown): boolean {
    const statusCode = getErrorStatusCode(error);
    return statusCode === undefined || statusCode >= 500;
}

function getTelegramErrorPayload(error: unknown): TelegramErrorPayload | undefined {
    if (typeof error !== 'object' || error === null) return undefined;

    const data =
        error instanceof HttpRequestError
            ? error.responseData
            : (error as HttpErrorLike).response?.data;
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

export interface TelegramClientRequest {
    method: string;
    data?: unknown;
    retries: number;
    networkRetries: number;
}

export type TelegramClientNext = (request: TelegramClientRequest) => Promise<unknown>;
export type TelegramClientTransformer = (next: TelegramClientNext) => TelegramClientNext;

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

interface TelegramApiResponse {
    ok: boolean;
    result?: unknown;
    error_code?: number;
    description?: string;
}

export class TelegramClient {
    private http: HttpTransport;
    private readonly apiBaseUrl: string;
    private readonly _token: string;
    private readonly hooks?: TelegramClientHooks;
    private readonly maxJsonPayloadBytes: number;
    private readonly networkRetries: number;
    private readonly networkRetryBaseDelayMs: number;
    private readonly networkRetryMaxDelayMs: number;
    private requestTransformers: TelegramClientTransformer[] = [];

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

        this.apiBaseUrl = `https://api.telegram.org/bot${this._token}/`;
        this.http = createHttpTransport();
    }

    /**
     * Internal token accessor — used only for file downloads and WebApp validation.
     * Not exposed to library consumers.
     */
    get token(): string {
        return this._token;
    }

    /**
     * Registers an outgoing Telegram API request transformer.
     *
     * Transformers wrap `callApi()` requests and can retry, throttle, log, or
     * short-circuit requests before they reach the HTTP transport.
     */
    use(transformer: TelegramClientTransformer): this {
        if (typeof transformer !== 'function') {
            throw new TypeError('TelegramClient transformer must be a function.');
        }

        this.ensureOwnTransformers();
        this.requestTransformers.push(transformer);
        return this;
    }

    private ensureOwnTransformers(): void {
        if (Object.prototype.hasOwnProperty.call(this, 'requestTransformers')) {
            return;
        }

        this.requestTransformers = [...this.requestTransformers];
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
        const { body: reqData, headers, isMultipart } = prepareRequestPayload(data);

        try {
            await this.invokeHook('onRequestStart', () =>
                this.hooks?.onRequestStart?.({ method, attempt, isMultipart })
            );

            const response = await this.http.request<TelegramApiResponse>({
                method: 'POST',
                url: new URL(method, this.apiBaseUrl).toString(),
                headers,
                body: isMultipart
                    ? (reqData as AsyncIterable<Uint8Array>)
                    : JSON.stringify(reqData ?? {}),
                timeoutMs: 50000,
                responseType: 'json',
            });
            const result = response.data;
            if (!result.ok) {
                const errorCode = result.error_code ?? 0;
                const description = result.description ?? 'Telegram request failed';
                throw new TelegramApiError(
                    `Telegram request failed: [${errorCode}] ${description}`,
                    errorCode,
                    description
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
            sanitizeHttpError(error, this._token);

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

    private createRequestPipeline(): TelegramClientNext {
        const transport: TelegramClientNext = request =>
            this.callApiAttempt(
                request.method,
                request.data,
                request.retries,
                request.networkRetries,
                1
            );

        return this.requestTransformers.reduceRight(
            (next, transformer) => transformer(next),
            transport
        );
    }

    /**
     * Calls a Telegram Bot API method with automatic multipart/form-data delegation
     * plus rate-limit and optional network retry handling.
     */
    async callApi(method: string, data?: any, retries: number = 3): Promise<any> {
        validateNonNegativeIntegerOption('retries', retries);

        return this.createRequestPipeline()({
            method,
            data,
            retries,
            networkRetries: this.networkRetries,
        });
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
        const response = await this.http.request<Buffer | Readable>({
            method: 'GET',
            url,
            timeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
            responseType: destPath ? 'stream' : 'buffer',
        });

        const contentLengthHeader = response.headers['content-length'];
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength) && contentLength > DEFAULT_MAX_DOWNLOAD_BYTES) {
            throw createDownloadLimitError();
        }

        if (destPath) {
            return new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(destPath);
                const stream = response.data as Readable;
                let downloadedBytes = 0;
                let settled = false;

                const fail = (err: Error) => {
                    if (settled) return;
                    settled = true;
                    writer.destroy();
                    stream.destroy();
                    const rejection =
                        err instanceof NetworkError
                            ? err
                            : new NetworkError(`Download failed: ${err.message}`, err);
                    fs.promises
                        .unlink(destPath)
                        .catch(() => undefined)
                        .finally(() => {
                            reject(rejection);
                        });
                };

                stream.on('data', (chunk: unknown) => {
                    downloadedBytes += getChunkByteLength(chunk);
                    if (downloadedBytes > DEFAULT_MAX_DOWNLOAD_BYTES) {
                        fail(createDownloadLimitError());
                    }
                });
                stream.on('error', fail);
                stream.pipe(writer);
                writer.on('finish', () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                });
                writer.on('error', fail);
            });
        }

        const buffer = Buffer.from(response.data as Buffer);
        if (buffer.byteLength > DEFAULT_MAX_DOWNLOAD_BYTES) {
            throw createDownloadLimitError();
        }
        return buffer;
    }
}
