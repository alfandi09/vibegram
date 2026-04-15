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
});
