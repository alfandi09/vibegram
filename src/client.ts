import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as https from 'https';
import { NetworkError, RateLimitError, TelegramApiError } from './errors';

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

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
        config?: {
            baseURL?: unknown;
            url?: unknown;
        };
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

export interface TelegramClientHooks {
    onRequestStart?: (event: TelegramClientRequestEvent) => void | Promise<void>;
    onRequestSuccess?: (event: TelegramClientSuccessEvent) => void | Promise<void>;
    onRequestError?: (event: TelegramClientErrorEvent) => void | Promise<void>;
    onRateLimitRetry?: (event: TelegramClientRetryEvent) => void | Promise<void>;
}

export interface TelegramClientOptions {
    hooks?: TelegramClientHooks;
}

export class TelegramClient {
    private http: AxiosInstance;
    private readonly _token: string;
    private readonly hooks?: TelegramClientHooks;

    constructor(token: string, options?: TelegramClientOptions) {
        this._token = token;
        this.hooks = options?.hooks;
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

    /**
     * Calls a Telegram Bot API method with automatic multipart/form-data delegation
     * and recursive rate-limit retry handling.
     */
    async callApi(
        method: string,
        data?: any,
        retries: number = 3,
        attempt: number = 1
    ): Promise<any> {
        const start = Date.now();
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
        } catch (error: any) {
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

            // Handle Rate Limiting (429 Too Many Requests) with auto-retry.
            if (error.response && error.response.status === 429 && retries > 0) {
                const retryAfter = error.response.data?.parameters?.retry_after || 1;
                await this.invokeHook('onRateLimitRetry', () =>
                    this.hooks?.onRateLimitRetry?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error,
                        statusCode: 429,
                        retryAfter,
                        remainingRetries: retries,
                    })
                );
                console.warn(`[Rate Limit] Telegram quota exceeded. Retrying in ${retryAfter}s...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.callApi(method, data, retries - 1, attempt + 1);
            }

            if (error.response && error.response.data) {
                const apiError = error.response.data;
                const typedError =
                    error.response.status === 429
                        ? new RateLimitError(apiError.parameters?.retry_after || 1)
                        : new TelegramApiError(
                              `Telegram request failed: [${apiError.error_code}] ${apiError.description}`,
                              apiError.error_code,
                              apiError.description
                          );

                await this.invokeHook('onRequestError', () =>
                    this.hooks?.onRequestError?.({
                        method,
                        attempt,
                        isMultipart,
                        durationMs: Date.now() - start,
                        error: typedError,
                        statusCode: error.response.status,
                    })
                );

                if (error.response.status === 429) {
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
