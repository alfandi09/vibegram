import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { Bot } from '../src/bot';
import { TelegramClient } from '../src/client';
import { InvalidTokenError, NetworkError, RateLimitError, TelegramApiError } from '../src/errors';
import { HttpRequestError, type HttpResponse, type HttpTransport } from '../src/http';
import { hasStreamUpload, prepareRequestPayload } from '../src/multipart';
import type { Gift, Message, MessageId, Update } from '../src/types';

function makeResponse<T>(data: T): HttpResponse<T> {
    return { data, headers: {}, status: 200 };
}

function setMockTransport(client: TelegramClient, request: ReturnType<typeof vi.fn>) {
    (client as unknown as { http: HttpTransport }).http = { request, postJson: vi.fn() };
    return request;
}

async function readBody(body: unknown): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

function rateLimitError(): HttpRequestError {
    return new HttpRequestError('HTTP Error: 429', 'https://api.telegram.org/x', 429, {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 0.001 },
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('TelegramClient: apiRoot and timeouts', () => {
    it('uses a custom apiRoot for API calls and file links', async () => {
        const client = new TelegramClient('123:abc', { apiRoot: 'http://localhost:8081/' });
        const request = setMockTransport(
            client,
            vi.fn().mockResolvedValue(makeResponse({ ok: true, result: { file_path: 'a/b.jpg' } }))
        );

        const link = await client.getFileLink('file-id');

        expect(request.mock.calls[0][0].url).toBe('http://localhost:8081/bot123:abc/getFile');
        expect(link).toBe('http://localhost:8081/file/bot123:abc/a/b.jpg');
    });

    it('defaults to the official Bot API server', async () => {
        const client = new TelegramClient('123:abc');
        const request = setMockTransport(
            client,
            vi.fn().mockResolvedValue(makeResponse({ ok: true, result: true }))
        );

        await client.callApi('getMe');

        expect(request.mock.calls[0][0].url).toBe('https://api.telegram.org/bot123:abc/getMe');
    });

    it('rejects invalid apiRoot and timeoutMs values', () => {
        expect(() => new TelegramClient('t', { apiRoot: 'not a url' })).toThrow(TypeError);
        expect(() => new TelegramClient('t', { apiRoot: 'ftp://host' })).toThrow(TypeError);
        expect(() => new TelegramClient('t', { timeoutMs: 0 })).toThrow(TypeError);
    });

    it('extends the request timeout to cover long getUpdates polls', async () => {
        const client = new TelegramClient('t', { timeoutMs: 5000 });
        const request = setMockTransport(
            client,
            vi.fn().mockResolvedValue(makeResponse({ ok: true, result: [] }))
        );

        await client.callApi('getUpdates', { timeout: 60 });
        await client.callApi('sendMessage', { chat_id: 1, text: 'x' });

        expect(request.mock.calls[0][0].timeoutMs).toBe(70000);
        expect(request.mock.calls[1][0].timeoutMs).toBe(5000);
    });
});

describe('TelegramClient: retries never replay consumed streams', () => {
    it('does not retry a 429 when the upload is a stream', async () => {
        const client = new TelegramClient('t');
        const request = setMockTransport(client, vi.fn().mockRejectedValue(rateLimitError()));

        await expect(
            client.callApi('sendDocument', { chat_id: 1, document: Readable.from(['abc']) })
        ).rejects.toBeInstanceOf(RateLimitError);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not retry network failures when the upload is a stream', async () => {
        const client = new TelegramClient('t', { networkRetries: 3, networkRetryBaseDelayMs: 0 });
        const request = setMockTransport(
            client,
            vi.fn().mockRejectedValue(new HttpRequestError('socket hang up', 'https://x'))
        );

        await expect(
            client.callApi('sendDocument', {
                chat_id: 1,
                document: { source: Readable.from(['abc']), filename: 'a.txt' },
            })
        ).rejects.toBeInstanceOf(NetworkError);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('still retries 429 for replayable Buffer uploads', async () => {
        const client = new TelegramClient('t');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const request = setMockTransport(
            client,
            vi
                .fn()
                .mockRejectedValueOnce(rateLimitError())
                .mockResolvedValue(makeResponse({ ok: true, result: { message_id: 1 } }))
        );

        await client.callApi('sendDocument', { chat_id: 1, document: Buffer.from('abc') });
        expect(request).toHaveBeenCalledTimes(2);
    });

    it('detects stream uploads anywhere in the payload', () => {
        expect(hasStreamUpload({ document: Buffer.from('x') })).toBe(false);
        expect(hasStreamUpload({ document: Readable.from(['x']) })).toBe(true);
        expect(hasStreamUpload({ media: [{ media: { source: Readable.from(['x']) } }] })).toBe(
            true
        );
    });
});

describe('multipart: upload file names and content types', () => {
    it('uses filename and contentType from an InputFileUpload descriptor', async () => {
        const prepared = prepareRequestPayload({
            chat_id: 1,
            document: {
                source: Buffer.from('%PDF'),
                filename: 'report.pdf',
                contentType: 'application/pdf',
            },
        });

        const body = await readBody(prepared.body);
        expect(prepared.isMultipart).toBe(true);
        expect(body).toContain('name="document"; filename="report.pdf"');
        expect(body).toContain('Content-Type: application/pdf');
        expect(body).toContain('%PDF');
    });

    it('uses the fs.ReadStream basename when no filename is given', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibegram-upload-'));
        const filePath = path.join(dir, 'notes.txt');
        fs.writeFileSync(filePath, 'hello');

        try {
            const prepared = prepareRequestPayload({
                chat_id: 1,
                document: fs.createReadStream(filePath),
            });
            const body = await readBody(prepared.body);
            expect(body).toContain('filename="notes.txt"');
            expect(body).toContain('hello');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('keeps the field-name fallback and strips CR/LF from metadata', async () => {
        const prepared = prepareRequestPayload({
            photo: Buffer.from('x'),
            document: {
                source: Buffer.from('y'),
                filename: 'a\r\nX-Evil: 1.txt',
                contentType: 'text/plain\r\nX-Evil: 1',
            },
        });

        const body = await readBody(prepared.body);
        expect(body).toContain('name="photo"; filename="photo"');
        expect(body).toContain('filename="aX-Evil: 1.txt"');
        expect(body).toContain('Content-Type: text/plainX-Evil: 1\r\n');
        expect(body).not.toContain('\r\nX-Evil: 1');
    });

    it('serializes nested descriptors with attach:// references', async () => {
        const prepared = prepareRequestPayload({
            media: [{ type: 'document', media: { source: Buffer.from('z'), filename: 'z.csv' } }],
        });

        const body = await readBody(prepared.body);
        expect(body).toContain('"media":"attach://media_0_media"');
        expect(body).toContain('filename="z.csv"');
    });
});

describe('Bot: launch error mapping, signals, and client options', () => {
    it('maps only 401/404 getMe failures to InvalidTokenError', async () => {
        const bot = new Bot('bad-token');
        bot.client.callApi = vi
            .fn()
            .mockRejectedValue(new TelegramApiError('Unauthorized', 401, 'Unauthorized')) as any;
        await expect(bot.launch()).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it('surfaces network failures during launch instead of InvalidTokenError', async () => {
        const bot = new Bot('token');
        const networkError = new NetworkError('Network Error: ENOTFOUND');
        bot.client.callApi = vi.fn().mockRejectedValue(networkError) as any;
        await expect(bot.launch()).rejects.toBe(networkError);
    });

    it('registers signal handlers once and removes them on stop()', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const bot = new Bot('token', { polling: { interval: 0 } });
        bot.client.callApi = vi.fn(async (method: string) => {
            if (method === 'getMe') return { id: 1, is_bot: true, first_name: 'B', username: 'b' };
            await new Promise(resolve => setTimeout(resolve, 5));
            return [];
        }) as any;

        const before = process.listenerCount('SIGINT');
        await bot.launch();
        expect(process.listenerCount('SIGINT')).toBe(before + 1);
        await bot.stop();
        expect(process.listenerCount('SIGINT')).toBe(before);

        await bot.launch({ handleSignals: false });
        expect(process.listenerCount('SIGINT')).toBe(before);
        await bot.stop();
    });

    it('forwards client options such as apiRoot to the TelegramClient', async () => {
        const bot = new Bot('123:abc', { client: { apiRoot: 'http://127.0.0.1:8081' } });
        const request = setMockTransport(
            bot.client,
            vi.fn().mockResolvedValue(makeResponse({ ok: true, result: true }))
        );

        await bot.getMe();
        expect(request.mock.calls[0][0].url).toBe('http://127.0.0.1:8081/bot123:abc/getMe');
    });

    it('validates polling.maxUpdateAttempts', () => {
        expect(() => new Bot('t', { polling: { maxUpdateAttempts: 0 } })).toThrow(TypeError);
        expect(() => new Bot('t', { polling: { maxUpdateAttempts: 1.5 } })).toThrow(TypeError);
        expect(() => new Bot('t', { polling: { maxUpdateAttempts: Infinity } })).not.toThrow();
    });
});

describe('Bot: processed offset commit skips poison updates', () => {
    it('skips an update that keeps failing after maxUpdateAttempts', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const onPollingError = vi.fn();
        const bot = new Bot('token', {
            polling: { interval: 0, offsetCommit: 'processed', maxUpdateAttempts: 2 },
            observability: { hooks: { onPollingError } },
        });
        vi.spyOn(bot as any, '_registerSignals').mockImplementation(() => {});

        const poison: Update = {
            update_id: 10,
            message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' }, text: 'boom' },
        };
        const healthy: Update = {
            update_id: 11,
            message: { message_id: 2, date: 1, chat: { id: 1, type: 'private' }, text: 'ok' },
        };
        const offsets: number[] = [];
        const handled: number[] = [];

        bot.client.callApi = vi.fn(async (method: string, params?: { offset?: number }) => {
            if (method === 'getMe') return { id: 1, is_bot: true, first_name: 'B', username: 'b' };
            offsets.push(params?.offset ?? 0);
            if (offsets.length > 4) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return [];
            }
            return (params?.offset ?? 0) <= 10 ? [poison, healthy] : [healthy];
        }) as any;

        bot.on('message', ctx => {
            if (ctx.message?.text === 'boom') throw new Error('handler crashed');
            handled.push(ctx.update.update_id);
        });

        await bot.launch();
        await vi.advanceTimersByTimeAsync(10000);
        const stopPromise = bot.stop();
        await vi.advanceTimersByTimeAsync(2000);
        await stopPromise;

        // Attempt 1 fails -> retry same offset; attempt 2 fails -> skip and move on.
        expect(offsets.slice(0, 3)).toEqual([0, 0, 12]);
        expect(handled).toContain(11);
        expect(onPollingError).toHaveBeenCalled();
    });
});

describe('API return types match the Bot API spec', () => {
    it('types copyMessages/forwardMessages as MessageId[], setGameScore as Message | true', async () => {
        const { Context } = await import('../src/context');
        const { createMockClient } = await import('./helpers/mock');
        const client = createMockClient([{ message_id: 5 }]);
        const ctx = new Context(
            { update_id: 1, message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } } },
            client
        );

        const copied = await ctx.copyMessages(2, [1]);
        const forwarded = await ctx.forwardMessages(2, [1]);
        expectTypeOf(copied).toEqualTypeOf<MessageId[]>();
        expectTypeOf(forwarded).toEqualTypeOf<MessageId[]>();
        expect(copied[0].message_id).toBe(5);

        const bot = new Bot('token');
        expectTypeOf(bot.setGameScore).returns.resolves.toEqualTypeOf<Message | true>();
    });

    it('uses Gift.id as in the Bot API', () => {
        const gift: Gift = { id: 'gift-1', sticker: undefined, star_count: 10 };
        expectTypeOf(gift.id).toEqualTypeOf<string>();
    });
});
