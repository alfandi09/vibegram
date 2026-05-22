import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ThrottlerQueueOverflowError,
    apiThrottler,
    type TelegramClientNext,
    type TelegramClientRequest,
} from '../src/index';

function request(method: string, data: Record<string, unknown> = {}): TelegramClientRequest {
    return {
        method,
        data,
        retries: 3,
        networkRetries: 0,
    };
}

function deferred<T = void>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve;
        reject = innerReject;
    });

    return { promise, resolve, reject };
}

async function flush(): Promise<void> {
    await Promise.resolve();
}

describe('@vibegram/throttler', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should throttle global API calls', async () => {
        const starts: number[] = [];
        const throttler = apiThrottler({
            global: { maxConcurrent: 1, minTime: 50 },
            private: false,
            group: false,
        });
        const next: TelegramClientNext = vi.fn(async () => {
            starts.push(Date.now());
            return true;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('getMe'));
        const second = pipeline(request('getWebhookInfo'));

        await flush();
        expect(starts).toEqual([0]);

        await vi.advanceTimersByTimeAsync(49);
        expect(starts).toEqual([0]);

        await vi.advanceTimersByTimeAsync(1);
        await expect(first).resolves.toBe(true);
        await expect(second).resolves.toBe(true);

        expect(starts).toEqual([0, 50]);
    });

    it('should throttle per chat while allowing different chats to proceed', async () => {
        const starts: string[] = [];
        const throttler = apiThrottler({
            global: { maxConcurrent: 10, minTime: 0 },
            group: { maxConcurrent: 1, minTime: 100 },
            private: false,
        });
        const next: TelegramClientNext = vi.fn(async request => {
            starts.push(`${String(readChatId(request))}:${Date.now()}`);
            return true;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('sendMessage', { chat_id: -100 }));
        const second = pipeline(request('sendMessage', { chat_id: -100 }));
        const third = pipeline(request('sendMessage', { chat_id: -200 }));

        await flush();
        expect(starts).toEqual(['-100:0', '-200:0']);

        await vi.advanceTimersByTimeAsync(100);
        await Promise.all([first, second, third]);

        expect(starts).toEqual(['-100:0', '-200:0', '-100:100']);
    });

    it('should preserve bucket order while prioritizing urgent queued requests', async () => {
        const firstGate = deferred();
        const starts: string[] = [];
        const throttler = apiThrottler({
            global: { maxConcurrent: 1, minTime: 0 },
            private: false,
            group: false,
            methods: {
                answerCallbackQuery: { priority: 10 },
            },
        });
        const next: TelegramClientNext = vi.fn(async request => {
            starts.push(request.method);

            if (request.method === 'sendMessage:first') {
                await firstGate.promise;
            }

            return request.method;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('sendMessage:first'));
        const low = pipeline(request('sendMessage:low'));
        const urgent = pipeline(request('answerCallbackQuery'));

        await flush();
        expect(starts).toEqual(['sendMessage:first']);

        firstGate.resolve();
        await Promise.all([first, low, urgent]);

        expect(starts).toEqual(['sendMessage:first', 'answerCallbackQuery', 'sendMessage:low']);
    });

    it('should reject when the queue exceeds max size', async () => {
        const gate = deferred();
        const throttler = apiThrottler({
            global: { maxConcurrent: 1, minTime: 0 },
            private: false,
            group: false,
            maxQueueSize: 1,
        });
        const next: TelegramClientNext = vi.fn(async request => {
            if (request.method === 'first') {
                await gate.promise;
            }

            return true;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('first'));
        const second = pipeline(request('second'));
        const third = pipeline(request('third'));

        await expect(third).rejects.toBeInstanceOf(ThrottlerQueueOverflowError);

        gate.resolve();
        await Promise.all([first, second]);
    });

    it('should support dropping the oldest queued request', async () => {
        const gate = deferred();
        const throttler = apiThrottler({
            global: { maxConcurrent: 1, minTime: 0 },
            private: false,
            group: false,
            maxQueueSize: 1,
            queueStrategy: 'drop-oldest',
        });
        const next: TelegramClientNext = vi.fn(async request => {
            if (request.method === 'first') {
                await gate.promise;
            }

            return request.method;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('first'));
        const dropped = pipeline(request('dropped'));
        const kept = pipeline(request('kept'));

        await expect(dropped).rejects.toBeInstanceOf(ThrottlerQueueOverflowError);

        gate.resolve();
        await expect(first).resolves.toBe('first');
        await expect(kept).resolves.toBe('kept');
    });

    it('should drain queued and active requests on close', async () => {
        const gate = deferred();
        let closed = false;
        const throttler = apiThrottler({
            global: { maxConcurrent: 1, minTime: 0 },
            private: false,
            group: false,
        });
        const next: TelegramClientNext = vi.fn(async request => {
            if (request.method === 'first') {
                await gate.promise;
            }

            return request.method;
        });
        const pipeline = throttler(next);

        const first = pipeline(request('first'));
        const second = pipeline(request('second'));
        const closePromise = throttler.close().then(() => {
            closed = true;
        });

        await flush();
        expect(closed).toBe(false);
        await expect(pipeline(request('after-close'))).rejects.toThrow('closed');

        gate.resolve();
        await Promise.all([first, second, closePromise]);

        expect(closed).toBe(true);
        expect(throttler.stats()).toMatchObject({
            active: 0,
            pending: 0,
            closed: true,
        });
    });
});

function readChatId(request: TelegramClientRequest): unknown {
    if (typeof request.data !== 'object' || request.data === null || Array.isArray(request.data)) {
        return undefined;
    }

    return (request.data as Record<string, unknown>).chat_id;
}
