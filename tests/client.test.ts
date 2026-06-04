import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { TelegramClient } from '../src/client';
import { NetworkError, RateLimitError, TelegramApiError } from '../src/errors';
import { HttpRequestError, type HttpResponse, type HttpTransport } from '../src/http';

const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

function createByteStream(totalBytes: number): NodeJS.ReadableStream {
    let remaining = totalBytes;

    return new Readable({
        read() {
            if (remaining <= 0) {
                this.push(null);
                return;
            }

            const chunkSize = Math.min(remaining, 64 * 1024);
            remaining -= chunkSize;
            this.push(Buffer.alloc(chunkSize));
        },
    });
}

function makeResponse<T>(data: T, headers: Record<string, string> = {}): HttpResponse<T> {
    return { data, headers, status: 200 };
}

function createMockTransport(
    request: ReturnType<typeof vi.fn> = vi.fn()
): HttpTransport & { request: ReturnType<typeof vi.fn>; postJson: ReturnType<typeof vi.fn> } {
    return {
        request,
        postJson: vi.fn(),
    };
}

function setMockTransport(
    client: TelegramClient,
    request: ReturnType<typeof vi.fn> = vi.fn()
): ReturnType<typeof createMockTransport> {
    const transport = createMockTransport(request);
    (client as unknown as { http: HttpTransport }).http = transport;
    return transport;
}

function createTelegramHttpError(
    status: number,
    data: Record<string, unknown>,
    url = 'https://api.telegram.org/bottest-token/sendMessage'
): HttpRequestError {
    return new HttpRequestError(`HTTP Error: ${status}`, url, status, data, {});
}

async function readMultipartBody(body: unknown): Promise<string> {
    if (
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { getBuffer?: unknown }).getBuffer === 'function'
    ) {
        return (body as { getBuffer(): Buffer }).getBuffer().toString('utf8');
    }

    if (typeof body === 'object' && body !== null && Symbol.asyncIterator in body) {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    throw new TypeError('Unsupported multipart body in test.');
}

describe('TelegramClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws TelegramApiError when Telegram returns ok=false', async () => {
        const client = new TelegramClient('test-token');
        setMockTransport(
            client,
            vi.fn().mockResolvedValue(
                makeResponse({ ok: false, error_code: 400, description: 'Bad Request' })
            )
        );

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(TelegramApiError);
    });

    it('throws RateLimitError when 429 retries are exhausted', async () => {
        const client = new TelegramClient('test-token');
        setMockTransport(
            client,
            vi.fn().mockRejectedValue(
                createTelegramHttpError(429, {
                    error_code: 429,
                    description: 'Too Many Requests',
                    parameters: { retry_after: 2 },
                })
            )
        );

        await expect(client.callApi('sendMessage', {}, 0)).rejects.toEqual(
            expect.any(RateLimitError)
        );
    });

    it('throws NetworkError when request fails before receiving a response', async () => {
        const client = new TelegramClient('test-token');
        setMockTransport(
            client,
            vi.fn().mockRejectedValue(
                new HttpRequestError(
                    'Network Error: socket hang up',
                    'https://api.telegram.org/bottest-token/sendMessage'
                )
            )
        );

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(NetworkError);
    });

    it('retries transient network failures with exponential backoff when enabled', async () => {
        const hooks = {
            onNetworkRetry: vi.fn(),
            onRequestError: vi.fn(),
        };
        const client = new TelegramClient('test-token', {
            hooks,
            networkRetries: 2,
            networkRetryBaseDelayMs: 100,
            networkRetryMaxDelayMs: 1000,
        });
        const request = vi
            .fn()
            .mockRejectedValueOnce(
                new HttpRequestError(
                    'Network Error: socket hang up',
                    'https://api.telegram.org/bottest-token/sendMessage'
                )
            )
            .mockRejectedValueOnce(
                new HttpRequestError(
                    'Network Error: timeout',
                    'https://api.telegram.org/bottest-token/sendMessage'
                )
            )
            .mockResolvedValueOnce(makeResponse({ ok: true, result: true }));
        const delays: number[] = [];
        setMockTransport(client, request);

        vi.spyOn(global, 'setTimeout').mockImplementation(((fn: any, delay?: number) => {
            delays.push(delay ?? 0);
            fn();
            return 0;
        }) as any);

        await expect(client.callApi('sendMessage')).resolves.toBe(true);

        expect(request).toHaveBeenCalledTimes(3);
        expect(delays).toEqual([100, 200]);
        expect(hooks.onNetworkRetry).toHaveBeenCalledTimes(2);
        expect(hooks.onNetworkRetry).toHaveBeenLastCalledWith(
            expect.objectContaining({
                attempt: 2,
                retryAfterMs: 200,
                remainingRetries: 0,
            })
        );
        expect(hooks.onRequestError).not.toHaveBeenCalled();
    });

    it('retries HTTP 5xx responses but does not retry 4xx client errors', async () => {
        const serverErrorClient = new TelegramClient('test-token', {
            networkRetries: 1,
            networkRetryBaseDelayMs: 0,
        });
        const serverErrorRequest = vi
            .fn()
            .mockRejectedValueOnce(
                createTelegramHttpError(502, {
                    error_code: 502,
                    description: 'Bad Gateway',
                })
            )
            .mockResolvedValueOnce(makeResponse({ ok: true, result: true }));
        setMockTransport(serverErrorClient, serverErrorRequest);

        await expect(serverErrorClient.callApi('sendMessage')).resolves.toBe(true);
        expect(serverErrorRequest).toHaveBeenCalledTimes(2);

        const clientErrorClient = new TelegramClient('test-token', {
            networkRetries: 2,
            networkRetryBaseDelayMs: 0,
        });
        const clientErrorRequest = vi.fn().mockRejectedValue(
            createTelegramHttpError(400, {
                error_code: 400,
                description: 'Bad Request',
            })
        );
        setMockTransport(clientErrorClient, clientErrorRequest);

        await expect(clientErrorClient.callApi('sendMessage')).rejects.toBeInstanceOf(
            TelegramApiError
        );
        expect(clientErrorRequest).toHaveBeenCalledOnce();
    });

    it('validates network retry options', () => {
        expect(() => new TelegramClient('test-token', { networkRetries: -1 })).toThrow(
            'networkRetries'
        );
        expect(
            () =>
                new TelegramClient('test-token', {
                    networkRetryBaseDelayMs: Number.NaN,
                })
        ).toThrow('networkRetryBaseDelayMs');
        expect(() => new TelegramClient('test-token', { networkRetryMaxDelayMs: -1 })).toThrow(
            'networkRetryMaxDelayMs'
        );
    });

    it('allows request transformers to wrap API calls and override retry counts', async () => {
        const client = new TelegramClient('test-token', {
            networkRetries: 2,
            networkRetryBaseDelayMs: 0,
        });
        const request = vi.fn().mockRejectedValue(
            createTelegramHttpError(429, {
                error_code: 429,
                description: 'Too Many Requests',
                parameters: { retry_after: 1 },
            })
        );
        const seenRetries: number[] = [];
        const seenNetworkRetries: number[] = [];

        setMockTransport(client, request);

        client.use(next => async request => {
            seenRetries.push(request.retries);
            seenNetworkRetries.push(request.networkRetries);
            return next({ ...request, retries: 0, networkRetries: 0 });
        });

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(RateLimitError);

        expect(seenRetries).toEqual([3]);
        expect(seenNetworkRetries).toEqual([2]);
        expect(request).toHaveBeenCalledOnce();
    });

    it('rejects non-plain root payloads before sending', async () => {
        const client = new TelegramClient('test-token');
        const request = vi.fn();
        setMockTransport(client, request);

        await expect(client.callApi('sendMessage', new URLSearchParams())).rejects.toThrow(
            'plain object'
        );
        expect(request).not.toHaveBeenCalled();
    });

    it('rejects oversized JSON payloads before sending', async () => {
        const client = new TelegramClient('test-token', { maxJsonPayloadBytes: 20 });
        const request = vi.fn();
        setMockTransport(client, request);

        await expect(client.callApi('sendMessage', { text: 'x'.repeat(100) })).rejects.toThrow(
            'exceeds maximum size'
        );
        expect(request).not.toHaveBeenCalled();
    });

    it('does not apply JSON size limits to multipart uploads', async () => {
        const client = new TelegramClient('test-token', { maxJsonPayloadBytes: 1 });
        const request = vi.fn().mockResolvedValue(makeResponse({ ok: true, result: true }));
        setMockTransport(client, request);

        await expect(
            client.callApi('sendPhoto', { chat_id: 99, photo: Buffer.from('large-upload') })
        ).resolves.toBe(true);
        expect(request).toHaveBeenCalledOnce();
    });

    it('redacts bot tokens from HTTP transport errors before wrapping them', async () => {
        const token = '123456:secret-token';
        const client = new TelegramClient(token);
        const httpError = new HttpRequestError(
            `Network Error: socket hang up for bot ${token}`,
            `https://api.telegram.org/bot${token}/sendMessage?token=${token}`
        );

        setMockTransport(client, vi.fn().mockRejectedValue(httpError));

        let thrown: unknown;
        try {
            await client.callApi('sendMessage');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(NetworkError);
        const originalError = (thrown as NetworkError).originalError as any;
        expect((thrown as NetworkError).message).not.toContain(token);
        expect(originalError.message).not.toContain(token);
        expect(originalError.requestUrl).not.toContain(token);
        expect(JSON.stringify(originalError)).not.toContain(token);
    });

    it('applies timeout and size limits when downloading files', async () => {
        const client = new TelegramClient('test-token');
        vi.spyOn(client, 'getFileLink').mockResolvedValue('https://example.com/file');
        const request = vi.fn().mockResolvedValue(makeResponse(Buffer.from([1, 2, 3])));
        setMockTransport(client, request);

        const buffer = await client.downloadFile('file-1');

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(request).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'GET',
                url: 'https://example.com/file',
                timeoutMs: 30000,
                responseType: 'buffer',
            })
        );
    });

    it('rejects downloads when content-length exceeds the maximum', async () => {
        const client = new TelegramClient('test-token');
        vi.spyOn(client, 'getFileLink').mockResolvedValue('https://example.com/file');
        setMockTransport(
            client,
            vi
                .fn()
                .mockResolvedValue(
                    makeResponse(Buffer.from([1, 2, 3]), {
                        'content-length': String(MAX_DOWNLOAD_BYTES + 1),
                    })
                )
        );

        await expect(client.downloadFile('file-1')).rejects.toBeInstanceOf(NetworkError);
    });

    it('rejects buffer downloads when bytes exceed the maximum without content-length', async () => {
        const client = new TelegramClient('test-token');
        vi.spyOn(client, 'getFileLink').mockResolvedValue('https://example.com/file');
        setMockTransport(
            client,
            vi.fn().mockResolvedValue(makeResponse(Buffer.alloc(MAX_DOWNLOAD_BYTES + 1)))
        );

        let thrown: unknown;
        try {
            await client.downloadFile('file-1');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(NetworkError);
    });

    it('rejects and cleans up partial files when streamed bytes exceed the maximum', async () => {
        const client = new TelegramClient('test-token');
        const destPath = path.join(os.tmpdir(), `vibegram-download-${Date.now()}.bin`);
        vi.spyOn(client, 'getFileLink').mockResolvedValue('https://example.com/file');
        setMockTransport(
            client,
            vi.fn().mockResolvedValue(makeResponse(createByteStream(MAX_DOWNLOAD_BYTES + 1)))
        );

        let thrown: unknown;
        try {
            await client.downloadFile('file-1', destPath);
        } catch (error) {
            thrown = error;
        }

        try {
            expect(thrown).toBeInstanceOf(NetworkError);
            await expect(fs.promises.access(destPath)).rejects.toThrow();
        } finally {
            await fs.promises.unlink(destPath).catch(() => undefined);
        }
    });

    it('emits request lifecycle hooks on success and retry', async () => {
        const hooks = {
            onRequestStart: vi.fn(),
            onRequestSuccess: vi.fn(),
            onRequestError: vi.fn(),
            onRateLimitRetry: vi.fn(),
        };
        const client = new TelegramClient('test-token', { hooks });
        setMockTransport(
            client,
            vi
                .fn()
                .mockRejectedValueOnce(
                    createTelegramHttpError(429, { parameters: { retry_after: 1 } })
                )
                .mockResolvedValueOnce(makeResponse({ ok: true, result: { ok: true } }))
        );

        vi.spyOn(global, 'setTimeout').mockImplementation(((fn: any) => {
            fn();
            return 0;
        }) as any);

        await expect(client.callApi('sendMessage')).resolves.toEqual({ ok: true });

        expect(hooks.onRequestStart).toHaveBeenCalledTimes(2);
        expect(hooks.onRateLimitRetry).toHaveBeenCalledTimes(1);
        expect(hooks.onRequestSuccess).toHaveBeenCalledTimes(1);
        expect(hooks.onRequestError).not.toHaveBeenCalled();
    });

    it('emits request error hook on terminal failures', async () => {
        const hooks = {
            onRequestError: vi.fn(),
        };
        const client = new TelegramClient('test-token', { hooks });
        setMockTransport(
            client,
            vi.fn().mockRejectedValue(
                new HttpRequestError(
                    'Network Error: socket hang up',
                    'https://api.telegram.org/bottest-token/sendMessage'
                )
            )
        );

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(NetworkError);
        expect(hooks.onRequestError).toHaveBeenCalledTimes(1);
    });

    it('serializes nested uploads using attach syntax for media groups', async () => {
        const client = new TelegramClient('test-token');
        const request = vi.fn().mockResolvedValue(makeResponse({ ok: true, result: [] }));
        setMockTransport(client, request);

        await client.callApi('sendMediaGroup', {
            chat_id: 99,
            media: [
                {
                    type: 'photo',
                    media: Buffer.from('photo-a'),
                    caption: 'First',
                },
                {
                    type: 'video',
                    media: Buffer.from('video-b'),
                    thumbnail: Buffer.from('thumb-b'),
                },
            ],
        });

        const [requestOptions] = request.mock.calls[0];
        const payload = await readMultipartBody(requestOptions.body);

        expect(requestOptions.headers).toEqual(
            expect.objectContaining({ 'content-type': expect.any(String) })
        );
        expect(payload).toContain('"media":"attach://media_0_media"');
        expect(payload).toContain('"media":"attach://media_1_media"');
        expect(payload).toContain('"thumbnail":"attach://media_1_thumbnail"');
        expect(payload).toContain('name="media_0_media"');
        expect(payload).toContain('name="media_1_media"');
        expect(payload).toContain('name="media_1_thumbnail"');
    });

    it('serializes nested sticker uploads using attach syntax for InputSticker payloads', async () => {
        const client = new TelegramClient('test-token');
        const request = vi.fn().mockResolvedValue(makeResponse({ ok: true, result: true }));
        setMockTransport(client, request);

        await client.callApi('createNewStickerSet', {
            user_id: 42,
            name: 'animals_by_testbot',
            title: 'Animals',
            stickers: [
                {
                    sticker: Buffer.from('sticker-a'),
                    format: 'static',
                    emoji_list: ['😀'],
                },
            ],
        });

        const [requestOptions] = request.mock.calls[0];
        const payload = await readMultipartBody(requestOptions.body);

        expect(payload).toContain('"sticker":"attach://stickers_0_sticker"');
        expect(payload).toContain('name="stickers_0_sticker"');
    });
});
