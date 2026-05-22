import { describe, expect, it, vi } from 'vitest';

import {
    MemoryMetricSink,
    observability,
    redactError,
    redactValue,
    type ObservabilityFlavor,
    type ObservabilityMetric,
} from '../src/index';

describe('@vibegram/observability', () => {
    it('should emit update duration metrics with Telegram update metadata', async () => {
        let now = 100;
        const metrics = new MemoryMetricSink();
        const ctx = createContext();

        await observability({ clock: () => now, sink: metrics })(ctx, async () => {
            now += 15;
        });

        expect(metrics.events).toContainEqual(expect.objectContaining({
            type: 'update.duration',
            ok: true,
            durationMs: 15,
            updateId: 1,
            updateType: 'message',
            chatId: 123,
            fromId: 42,
        }));
    });

    it('should emit Telegram API request duration metrics and restore callApi', async () => {
        let now = 200;
        const metrics: ObservabilityMetric[] = [];
        const ctx = createContext({ apiDelayMs: 7 });
        const originalCallApi = ctx.client.callApi;
        ctx.client.callApi = async (method, data) => {
            const result = await originalCallApi(method, data);
            now += 7;
            return result;
        };
        const delayedCallApi = ctx.client.callApi;

        await observability({
            clock: () => now,
            onMetric: metric => metrics.push(metric),
        })(ctx, async () => {
            await ctx.client.callApi('sendMessage', {
                chat_id: 123,
                text: 'hello',
            });
        });

        expect(metrics).toContainEqual(expect.objectContaining({
            type: 'api.duration',
            ok: true,
            method: 'sendMessage',
            durationMs: 7,
        }));
        expect(ctx.client.callApi).toBe(delayedCallApi);
    });

    it('should redact sensitive values in standalone helpers', () => {
        expect(redactValue({
            token: '123456:ABC',
            nested: {
                authorization: 'Bearer secret',
                prompt: 'private prompt',
                ok: true,
            },
        })).toEqual({
            token: '[REDACTED]',
            nested: {
                authorization: '[REDACTED]',
                prompt: '[REDACTED]',
                ok: true,
            },
        });

        expect(redactError(new Error('failed token 123456:ABC'))).toEqual({
            name: 'Error',
            message: 'failed token [REDACTED]',
        });
    });

    it('should record middleware errors without stack leakage and rethrow by default', async () => {
        let now = 300;
        const metrics: ObservabilityMetric[] = [];
        const logs: unknown[] = [];
        const sentryErrors: unknown[] = [];
        const ctx = createContext();

        await expect(observability({
            clock: () => now,
            onMetric: metric => metrics.push(metric),
            logger: { error: entry => logs.push(entry) },
            sentry: {
                captureException(error) {
                    sentryErrors.push(error);
                },
            },
        })(ctx, async () => {
            now += 9;
            throw new Error('database password leaked');
        })).rejects.toThrow('database password leaked');

        expect(metrics).toContainEqual(expect.objectContaining({
            type: 'error.count',
            source: 'middleware',
            count: 1,
            error: {
                name: 'Error',
                message: 'database password leaked',
            },
        }));
        expect(metrics).toContainEqual(expect.objectContaining({
            type: 'update.duration',
            ok: false,
            durationMs: 9,
        }));
        expect(JSON.stringify(logs)).not.toContain('stack');
        expect(sentryErrors).toHaveLength(1);
    });

    it('should isolate observer failures from bot handlers', async () => {
        const ctx = createContext();
        const next = vi.fn(async () => undefined);

        await observability({
            onMetric() {
                throw new Error('metrics backend down');
            },
            logger: {
                info() {
                    throw new Error('logger down');
                },
            },
            openTelemetry: {
                recordMetric() {
                    throw new Error('otel down');
                },
            },
        })(ctx, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it('should emit API error metrics and keep original API error behavior', async () => {
        let now = 400;
        const metrics: ObservabilityMetric[] = [];
        const ctx = createContext({ apiError: new Error('HTTP 500 bot token 123456:ABC') });

        await expect(observability({
            clock: () => now,
            onMetric: metric => metrics.push(metric),
        })(ctx, async () => {
            const promise = ctx.client.callApi('sendMessage', { token: '123456:ABC' });
            now += 12;
            await promise;
        })).rejects.toThrow('HTTP 500');

        expect(metrics).toContainEqual(expect.objectContaining({
            type: 'api.duration',
            ok: false,
            method: 'sendMessage',
            durationMs: 12,
            error: {
                name: 'Error',
                message: 'HTTP 500 bot token [REDACTED]',
            },
        }));
        expect(metrics).toContainEqual(expect.objectContaining({
            type: 'error.count',
            source: 'api',
            count: 1,
        }));
    });

    it('should expose typed context flavor while middleware is active', async () => {
        const ctx = createContext();

        await observability()(ctx, async () => {
            expect(ctx.observability?.updateId).toBe(1);
        });

        function assertTypes(input: ObservabilityFlavor<ReturnType<typeof createContext>>) {
            void input.observability?.record({
                type: 'custom',
                count: 1,
            });
        }

        expect(typeof assertTypes).toBe('function');
    });
});

function createContext(options: {
    apiDelayMs?: number;
    apiError?: Error;
} = {}) {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];

    return {
        update: {
            update_id: 1,
            message: {
                text: 'hello',
                chat: { id: 123, type: 'private' },
                from: { id: 42, is_bot: false, first_name: 'Ada' },
            },
        },
        chat: { id: 123, type: 'private' },
        from: { id: 42, is_bot: false, first_name: 'Ada' },
        client: {
            calls,
            async callApi(method: string, data?: Record<string, unknown>) {
                calls.push([method, data]);
                if (options.apiError) {
                    throw options.apiError;
                }
                return { ok: true, delayMs: options.apiDelayMs ?? 0 };
            },
        },
    };
}
