import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as https from 'https';
import { NetworkError, RateLimitError, TelegramApiError } from './errors';

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

export class TelegramClient {
    private http: AxiosInstance;
    private readonly _token: string;

    constructor(token: string) {
        this._token = token;
        // Keep-Alive agent prevents repeated TCP/TLS handshakes in high-traffic environments.
        const agent = new https.Agent({ keepAlive: true, maxSockets: 100 });

        this.http = axios.create({
            baseURL: `https://api.telegram.org/bot${this._token}/`,
            timeout: 50000, // 50s accommodates the long-polling window (30-40s) without premature ETIMEDOUT.
            httpsAgent: agent,
        });
    }

    /**
     * Internal token accessor — used only for file downloads and WebApp validation.
     * Not exposed to library consumers.
     */
    get token(): string {
        return this._token;
    }

    /**
     * Calls a Telegram Bot API method with automatic multipart/form-data delegation
     * and recursive rate-limit retry handling.
     */
    async callApi(method: string, data?: any, retries: number = 3): Promise<any> {
        try {
            let reqData = data;
            let headers = {};

            if (data && typeof data === 'object') {
                // Detect Buffer or Stream values that require multipart encoding.
                const isMultipart = Object.values(data).some(
                    val => Buffer.isBuffer(val) || (val && typeof (val as any).pipe === 'function')
                );

                if (isMultipart) {
                    const form = new FormData();
                    for (const key of Object.keys(data)) {
                        if (data[key] !== undefined) {
                            let value = data[key];
                            // Serialize plain objects to JSON to prevent implicit "[object Object]" casting.
                            if (
                                typeof value === 'object' &&
                                !Buffer.isBuffer(value) &&
                                !(value && typeof (value as any).pipe === 'function')
                            ) {
                                value = JSON.stringify(value);
                            }
                            form.append(key, value);
                        }
                    }
                    reqData = form;
                    headers = form.getHeaders();
                }
            }

            const response = await this.http.post(method, reqData, { headers });
            const result = response.data;
            if (!result.ok) {
                throw new TelegramApiError(
                    `Telegram request failed: [${result.error_code}] ${result.description}`,
                    result.error_code,
                    result.description
                );
            }
            return result.result;
        } catch (error: any) {
            if (
                error instanceof TelegramApiError ||
                error instanceof NetworkError ||
                error instanceof RateLimitError
            ) {
                throw error;
            }

            // Handle Rate Limiting (429 Too Many Requests) with auto-retry.
            if (error.response && error.response.status === 429 && retries > 0) {
                const retryAfter = error.response.data?.parameters?.retry_after || 1;
                console.warn(`[Rate Limit] Telegram quota exceeded. Retrying in ${retryAfter}s...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.callApi(method, data, retries - 1);
            }

            if (error.response && error.response.data) {
                const apiError = error.response.data;
                if (error.response.status === 429) {
                    throw new RateLimitError(apiError.parameters?.retry_after || 1);
                }

                throw new TelegramApiError(
                    `Telegram request failed: [${apiError.error_code}] ${apiError.description}`,
                    apiError.error_code,
                    apiError.description
                );
            }

            throw new NetworkError(
                `Network Error: ${error.message}`,
                error instanceof Error ? error : undefined
            );
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
