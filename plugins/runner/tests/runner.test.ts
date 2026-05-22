import { describe, expect, it, vi } from 'vitest';

import { run, type RunnerBot, type RunnerUpdate } from '../src/index';

type TestUpdate = RunnerUpdate & {
    update_id: number;
    message?: {
        message_id: number;
        chat: { id: number };
        text?: string;
    };
};

function messageUpdate(updateId: number, chatId: number): TestUpdate {
    return {
        update_id: updateId,
        message: {
            message_id: updateId,
            chat: { id: chatId },
            text: `update-${updateId}`,
        },
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

async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(assertion: () => boolean, timeoutMs = 1000): Promise<void> {
    const startedAt = Date.now();

    while (!assertion()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('Timed out waiting for condition');
        }

        await delay(5);
    }
}

function createBot(
    batches: TestUpdate[][],
    handler: (update: TestUpdate) => Promise<void> | void
): RunnerBot {
    let batchIndex = 0;

    return {
        client: {
            callApi: vi.fn(async (method: string) => {
                expect(method).toBe('getUpdates');
                return batches[batchIndex++] ?? [];
            }),
        },
        handleUpdate: vi.fn((update: RunnerUpdate) => handler(update as TestUpdate)),
    };
}

describe('@vibegram/runner', () => {
    it('should process updates concurrently when concurrency is greater than one', async () => {
        let active = 0;
        let maxActive = 0;
        const handled: number[] = [];

        const bot = createBot(
            [[messageUpdate(1, 1), messageUpdate(2, 2)]],
            async (update) => {
                active += 1;
                maxActive = Math.max(maxActive, active);
                await delay(40);
                handled.push(update.update_id);
                active -= 1;
            }
        );

        const runner = run(bot, {
            concurrency: 2,
            orderedByChat: false,
            polling: { interval: 5, timeout: 0 },
        });

        await waitUntil(() => handled.length === 2);
        await runner.idle();
        await runner.stop();

        expect(maxActive).toBe(2);
        expect(handled.sort()).toEqual([1, 2]);
    });

    it('should preserve order for updates from the same chat', async () => {
        const firstUpdate = deferred();
        const events: string[] = [];

        const bot = createBot(
            [[messageUpdate(1, 100), messageUpdate(2, 100), messageUpdate(3, 200)]],
            async (update) => {
                events.push(`start:${update.update_id}`);

                if (update.update_id === 1) {
                    await firstUpdate.promise;
                }

                events.push(`end:${update.update_id}`);
            }
        );

        const runner = run(bot, {
            concurrency: 2,
            orderedByChat: true,
            polling: { interval: 5, timeout: 0 },
        });

        await waitUntil(() => events.includes('start:1') && events.includes('start:3'));

        expect(events).not.toContain('start:2');

        firstUpdate.resolve();
        await runner.idle();
        await runner.stop();

        expect(events.indexOf('end:1')).toBeLessThan(events.indexOf('start:2'));
    });

    it('should isolate handler errors and keep processing later updates', async () => {
        const onError = vi.fn();
        const handled: number[] = [];

        const bot = createBot(
            [[messageUpdate(1, 1), messageUpdate(2, 2)]],
            async (update) => {
                if (update.update_id === 1) {
                    throw new Error('handler failed');
                }

                handled.push(update.update_id);
            }
        );

        const runner = run(bot, {
            concurrency: 1,
            orderedByChat: false,
            polling: { interval: 5, timeout: 0 },
            onError,
        });

        await waitUntil(() => handled.length === 1 && onError.mock.calls.length === 1);
        await runner.idle();
        await runner.stop();

        expect(handled).toEqual([2]);
        expect(onError.mock.calls[0]?.[0]).toMatchObject({
            phase: 'handleUpdate',
            update: { update_id: 1 },
        });
    });

    it('should stop gracefully after in-flight updates finish', async () => {
        const inFlight = deferred();
        let stopResolved = false;

        const bot = createBot([[messageUpdate(1, 1)]], async () => {
            await inFlight.promise;
        });

        const runner = run(bot, {
            concurrency: 1,
            polling: { interval: 5, timeout: 0 },
            stopTimeoutMs: 500,
        });

        await waitUntil(() => vi.mocked(bot.handleUpdate).mock.calls.length === 1);

        const stopPromise = runner.stop().then(() => {
            stopResolved = true;
        });

        await delay(30);
        expect(stopResolved).toBe(false);

        inFlight.resolve();
        await stopPromise;

        expect(stopResolved).toBe(true);
    });

    it('should apply backpressure when the pending update queue is full', async () => {
        const firstUpdate = deferred();
        const onQueueFull = vi.fn();
        const started: number[] = [];

        const bot = createBot(
            [[messageUpdate(1, 1), messageUpdate(2, 2), messageUpdate(3, 3)]],
            async (update) => {
                started.push(update.update_id);

                if (update.update_id === 1) {
                    await firstUpdate.promise;
                }
            }
        );

        const runner = run(bot, {
            concurrency: 1,
            orderedByChat: false,
            maxQueueSize: 1,
            polling: { interval: 5, timeout: 0 },
            onQueueFull,
        });

        await waitUntil(() => onQueueFull.mock.calls.length === 1);

        expect(started).toEqual([1]);

        firstUpdate.resolve();
        await runner.idle();
        await runner.stop();

        expect(started).toEqual([1, 2, 3]);
        expect(onQueueFull.mock.calls[0]?.[0]).toMatchObject({
            pending: 1,
            active: 1,
            capacity: 1,
        });
    });
});
