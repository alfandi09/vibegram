import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { TelegramClient } from '../src/client';
import { NetworkError, RateLimitError, TelegramApiError } from '../src/errors';

describe('TelegramClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws TelegramApiError when Telegram returns ok=false', async () => {
        const client = new TelegramClient('test-token');
        (client as any).http = {
            post: vi.fn().mockResolvedValue({
                data: { ok: false, error_code: 400, description: 'Bad Request' },
            }),
        };

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(TelegramApiError);
    });

    it('throws RateLimitError when 429 retries are exhausted', async () => {
        const client = new TelegramClient('test-token');
        (client as any).http = {
            post: vi.fn().mockRejectedValue({
                response: {
                    status: 429,
                    data: {
                        error_code: 429,
                        description: 'Too Many Requests',
                        parameters: { retry_after: 2 },
                    },
                },
            }),
        };

        await expect(client.callApi('sendMessage', {}, 0)).rejects.toEqual(
            expect.any(RateLimitError)
        );
    });

    it('throws NetworkError when request fails before receiving a response', async () => {
        const client = new TelegramClient('test-token');
        (client as any).http = {
            post: vi.fn().mockRejectedValue(new Error('socket hang up')),
        };

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(NetworkError);
    });

    it('rejects non-plain root payloads before sending', async () => {
        const client = new TelegramClient('test-token');
        const post = vi.fn();
        (client as any).http = { post };

        await expect(client.callApi('sendMessage', new URLSearchParams())).rejects.toThrow(
            'plain object'
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('rejects oversized JSON payloads before sending', async () => {
        const client = new TelegramClient('test-token', { maxJsonPayloadBytes: 20 });
        const post = vi.fn();
        (client as any).http = { post };

        await expect(client.callApi('sendMessage', { text: 'x'.repeat(100) })).rejects.toThrow(
            'exceeds maximum size'
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('does not apply JSON size limits to multipart uploads', async () => {
        const client = new TelegramClient('test-token', { maxJsonPayloadBytes: 1 });
        const post = vi.fn().mockResolvedValue({
            data: { ok: true, result: true },
        });
        (client as any).http = { post };

        await expect(
            client.callApi('sendPhoto', { chat_id: 99, photo: Buffer.from('large-upload') })
        ).resolves.toBe(true);
        expect(post).toHaveBeenCalledOnce();
    });

    it('redacts bot tokens from axios errors before wrapping them', async () => {
        const token = '123456:secret-token';
        const client = new TelegramClient(token);
        const axiosError = Object.assign(new Error(`socket hang up for bot ${token}`), {
            config: {
                baseURL: `https://api.telegram.org/bot${token}/`,
                url: `sendMessage?token=${token}`,
            },
            response: {
                config: {
                    baseURL: `https://api.telegram.org/bot${token}/`,
                    url: `getMe?token=${token}`,
                },
            },
        });

        (client as any).http = {
            post: vi.fn().mockRejectedValue(axiosError),
        };

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
        expect(originalError.config.baseURL).not.toContain(token);
        expect(originalError.config.url).not.toContain(token);
        expect(originalError.response.config.baseURL).not.toContain(token);
        expect(originalError.response.config.url).not.toContain(token);
        expect(JSON.stringify(originalError)).not.toContain(token);
    });

    it('applies timeout and size limits when downloading files', async () => {
        const client = new TelegramClient('test-token');
        vi.spyOn(client, 'getFileLink').mockResolvedValue('https://example.com/file');
        const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
            data: new Uint8Array([1, 2, 3]),
            headers: {},
        } as any);

        const buffer = await client.downloadFile('file-1');

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(getSpy).toHaveBeenCalledWith(
            'https://example.com/file',
            expect.objectContaining({
                timeout: 30000,
                maxContentLength: 20 * 1024 * 1024,
                maxBodyLength: 20 * 1024 * 1024,
            })
        );
    });

    it('emits request lifecycle hooks on success and retry', async () => {
        const hooks = {
            onRequestStart: vi.fn(),
            onRequestSuccess: vi.fn(),
            onRequestError: vi.fn(),
            onRateLimitRetry: vi.fn(),
        };
        const client = new TelegramClient('test-token', { hooks });
        (client as any).http = {
            post: vi
                .fn()
                .mockRejectedValueOnce({
                    response: {
                        status: 429,
                        data: { parameters: { retry_after: 1 } },
                    },
                })
                .mockResolvedValueOnce({ data: { ok: true, result: { ok: true } } }),
        };

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
        (client as any).http = {
            post: vi.fn().mockRejectedValue(new Error('socket hang up')),
        };

        await expect(client.callApi('sendMessage')).rejects.toBeInstanceOf(NetworkError);
        expect(hooks.onRequestError).toHaveBeenCalledTimes(1);
    });

    it('serializes nested uploads using attach syntax for media groups', async () => {
        const client = new TelegramClient('test-token');
        const postSpy = vi.fn().mockResolvedValue({
            data: { ok: true, result: [] },
        });
        (client as any).http = { post: postSpy };

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

        const [, form, config] = postSpy.mock.calls[0];
        const payload = form.getBuffer().toString('utf8');

        expect(config.headers).toEqual(
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
        const postSpy = vi.fn().mockResolvedValue({
            data: { ok: true, result: true },
        });
        (client as any).http = { post: postSpy };

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

        const [, form] = postSpy.mock.calls[0];
        const payload = form.getBuffer().toString('utf8');

        expect(payload).toContain('"sticker":"attach://stickers_0_sticker"');
        expect(payload).toContain('name="stickers_0_sticker"');
    });
});
