import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    MemoryDevtoolsSink,
    createJsonlSink,
    createReplayFixture,
    devtools,
    replayUpdates,
    sanitizeValue,
    withDevtoolsTiming,
    type DevtoolsFlavor,
    type DevtoolsUpdate,
} from '../src/index';

describe('@vibegram/devtools', () => {
    it('should sanitize captured update snapshots', async () => {
        const sink = new MemoryDevtoolsSink();
        const ctx = createContext({
            update: {
                update_id: 1,
                message: {
                    text: '/start',
                    chat: { id: 123, type: 'private' },
                    from: { id: 42, is_bot: false, first_name: 'Ada' },
                },
                token: 'bot-token',
                customSecret: 'very-secret',
            },
        });

        await devtools({ capture: true, sink, redact: ['customSecret'] })(ctx, async () => undefined);

        const event = sink.events.find(entry => entry.type === 'update');
        expect(event?.update).toMatchObject({
            update_id: 1,
            token: '[REDACTED]',
            customSecret: '[REDACTED]',
            message: { text: '/start' },
        });
    });

    it('should replay update fixtures locally', async () => {
        const fixture = createReplayFixture({
            update_id: 2,
            message: { text: 'hello' },
            authorization: 'Bearer secret',
        });
        const handled: DevtoolsUpdate[] = [];

        await replayUpdates(update => {
            handled.push(update);
        }, [fixture]);

        expect(handled).toEqual([
            {
                update_id: 2,
                message: { text: 'hello' },
                authorization: '[REDACTED]',
            },
        ]);
    });

    it('should record middleware timing spans', async () => {
        const sink = new MemoryDevtoolsSink();
        let now = 100;
        const ctx = createContext();

        await devtools({ capture: true, sink, clock: () => now })(ctx, async () => {
            await ctx.devtools.time('handler', async () => {
                now += 12;
            });
            now += 5;
        });

        expect(sink.events).toContainEqual(
            expect.objectContaining({
                type: 'timing',
                name: 'handler',
                durationMs: 12,
            })
        );
        expect(sink.events).toContainEqual(
            expect.objectContaining({
                type: 'timing',
                name: 'update',
                durationMs: 17,
            })
        );
    });

    it('should redact Telegram API request and response logs deeply', async () => {
        const sink = new MemoryDevtoolsSink();
        const ctx = createContext({
            apiResult: { ok: true, access_token: 'response-token' },
        });

        await devtools({ capture: true, sink, includeApiResult: true })(ctx, async () => {
            await ctx.client.callApi('setWebhook', {
                url: 'https://example.com/webhook',
                secret_token: 'telegram-secret',
                nested: { authorization: 'Bearer secret' },
            });
        });

        const event = sink.events.find(entry => entry.type === 'api');
        expect(event).toMatchObject({
            type: 'api',
            method: 'setWebhook',
            ok: true,
            request: {
                secret_token: '[REDACTED]',
                nested: { authorization: '[REDACTED]' },
            },
            response: { ok: true, access_token: '[REDACTED]' },
        });
    });

    it('should not capture by default in production mode unless enabled', async () => {
        const sink = new MemoryDevtoolsSink();
        const ctx = createContext();

        await devtools({ env: 'production', sink })(ctx, async () => {
            await ctx.client.callApi('sendMessage', { text: 'hello' });
        });

        expect(sink.events).toEqual([]);
    });

    it('should write JSONL events for local debugging', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'vibegram-devtools-'));
        const filePath = join(dir, 'events.jsonl');

        try {
            const sink = createJsonlSink(filePath);
            await sink.write({ type: 'custom', timestamp: '2026-05-13T00:00:00.000Z' });

            const lines = (await readFile(filePath, 'utf8')).trim().split('\n');
            expect(JSON.parse(lines[0] ?? '{}')).toEqual({
                type: 'custom',
                timestamp: '2026-05-13T00:00:00.000Z',
            });
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('should expose timing wrapper and standalone sanitizer helpers', async () => {
        const sink = new MemoryDevtoolsSink();
        const ctx = createContext();

        await devtools({ capture: true, sink })(ctx, () =>
            withDevtoolsTiming('wrapped', async () => undefined)(ctx, async () => undefined)
        );

        expect(sink.events.some(event => event.type === 'timing' && event.name === 'wrapped')).toBe(true);
        expect(sanitizeValue({ password: 'secret', safe: 'ok' })).toEqual({
            password: '[REDACTED]',
            safe: 'ok',
        });
    });
});

function createContext(options: {
    update?: DevtoolsUpdate;
    apiResult?: unknown;
    apiError?: Error;
} = {}) {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];

    return {
        update: options.update ?? {
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

                return options.apiResult ?? { ok: true };
            },
        },
    } as DevtoolsFlavor<{
        update: DevtoolsUpdate;
        chat: { id: number; type: string };
        from: { id: number; is_bot: boolean; first_name: string };
        client: {
            calls: Array<[string, Record<string, unknown> | undefined]>;
            callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
        };
    }>;
}
