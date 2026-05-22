import { describe, expect, it, vi } from 'vitest';

import {
    autoRetry,
    type TelegramClientNext,
    type TelegramClientRequest,
} from '../src/index';

const DEFAULT_REQUEST: TelegramClientRequest = {
    method: 'sendMessage',
    data: { chat_id: 1, text: 'hello' },
    retries: 3,
    networkRetries: 2,
};

function rateLimitError(retryAfter: number, message = 'Too Many Requests'): Error {
    return Object.assign(new Error(message), {
        name: 'RateLimitError',
        retryAfter,
    });
}

function networkError(message = 'socket hang up'): Error {
    return Object.assign(new Error(message), {
        name: 'NetworkError',
    });
}

function telegramApiError(errorCode: number, message = 'Telegram failed'): Error {
    return Object.assign(new Error(message), {
        name: 'TelegramApiError',
        errorCode,
        description: message,
    });
}

function runWith(next: TelegramClientNext, request: TelegramClientRequest = DEFAULT_REQUEST) {
    return autoRetry({
        baseDelayMs: 100,
        maxDelayMs: 250,
        jitter: false,
        maxRetries: 3,
    })(next)(request);
}

function mockTimers(): number[] {
    const delays: number[] = [];
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void, delay?: number) => {
        delays.push(delay ?? 0);
        fn();
        return 0;
    }) as never);
    return delays;
}

describe('@vibegram/auto-retry', () => {
    it('should retry HTTP 429 using retry_after', async () => {
        const delays = mockTimers();
        const next = vi
            .fn()
            .mockRejectedValueOnce(rateLimitError(2))
            .mockResolvedValueOnce('ok');

        await expect(runWith(next)).resolves.toBe('ok');

        expect(delays).toEqual([2000]);
        expect(next).toHaveBeenCalledTimes(2);
        expect(next.mock.calls[0]?.[0]).toMatchObject({
            retries: 0,
            networkRetries: 0,
        });
    });

    it('should retry network errors with capped exponential backoff', async () => {
        const delays = mockTimers();
        const next = vi
            .fn()
            .mockRejectedValueOnce(networkError('ECONNRESET'))
            .mockRejectedValueOnce(networkError('ETIMEDOUT'))
            .mockResolvedValueOnce('ok');

        await expect(runWith(next)).resolves.toBe('ok');

        expect(delays).toEqual([100, 200]);
        expect(next).toHaveBeenCalledTimes(3);
    });

    it('should retry HTTP 5xx errors with capped exponential backoff', async () => {
        const delays = mockTimers();
        const next = vi
            .fn()
            .mockRejectedValueOnce(telegramApiError(502, 'Bad Gateway'))
            .mockRejectedValueOnce(telegramApiError(503, 'Service Unavailable'))
            .mockResolvedValueOnce('ok');

        await expect(runWith(next)).resolves.toBe('ok');

        expect(delays).toEqual([100, 200]);
        expect(next).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-idempotent methods when disabled', async () => {
        const next = vi.fn().mockRejectedValue(networkError());
        const transformer = autoRetry({
            retryNonIdempotentMethods: false,
            maxRetries: 3,
        });

        await expect(transformer(next)(DEFAULT_REQUEST)).rejects.toThrow('socket hang up');

        expect(next).toHaveBeenCalledOnce();
    });

    it('should respect method allowlists and blocklists', async () => {
        const next = vi.fn().mockRejectedValue(networkError());
        const transformer = autoRetry({
            includeMethods: ['sendMessage'],
            excludeMethods: ['sendMessage'],
            maxRetries: 3,
        });

        await expect(transformer(next)(DEFAULT_REQUEST)).rejects.toThrow('socket hang up');

        expect(next).toHaveBeenCalledOnce();
    });

    it('should redact token-like values from retry hook events', async () => {
        const delays = mockTimers();
        const token = '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ12345';
        const onRetry = vi.fn();
        const next = vi
            .fn()
            .mockRejectedValueOnce(networkError(`request failed for ${token}`))
            .mockResolvedValueOnce('ok');

        const result = autoRetry({
            baseDelayMs: 100,
            jitter: false,
            maxRetries: 1,
            onRetry,
        })(next)(DEFAULT_REQUEST);

        await expect(result).resolves.toBe('ok');

        expect(delays).toEqual([100]);
        expect(JSON.stringify(onRetry.mock.calls[0]?.[0])).not.toContain(token);
        expect(JSON.stringify(onRetry.mock.calls[0]?.[0])).toContain('[REDACTED]');
    });
});
