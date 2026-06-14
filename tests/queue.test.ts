import { describe, it, expect } from 'vitest';
import { BotQueue } from '../src/queue';
import { createMockClient } from './helpers/mock';

describe('BotQueue', () => {
    it('cancels only the targeted broadcast job', async () => {
        const queue = new BotQueue(createMockClient(), { concurrency: 1, delayMs: 0 });
        const callsA: Array<number | string> = [];
        const callsB: Array<number | string> = [];

        const broadcastA = queue.broadcast(
            [1, 2, 3],
            async chatId => {
                callsA.push(chatId);
                if (chatId === 1) {
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            },
            { broadcastId: 'job-a', concurrency: 1, delayMs: 0 }
        );

        await new Promise(resolve => setTimeout(resolve, 5));

        const broadcastB = queue.broadcast(
            [10, 11],
            async chatId => {
                callsB.push(chatId);
            },
            { broadcastId: 'job-b', concurrency: 1, delayMs: 0 }
        );

        queue.stopBroadcast('job-a');

        const [resultA, resultB] = await Promise.all([broadcastA, broadcastB]);

        expect(callsA).toEqual([1]);
        expect(callsB).toEqual([10, 11]);
        expect(resultA.success).toBe(1);
        expect(resultB.success).toBe(2);
        expect(queue.activeBroadcastCount).toBe(0);
    });

    it('stopBroadcast without id cancels all active jobs', async () => {
        const queue = new BotQueue(createMockClient(), { concurrency: 1, delayMs: 0 });
        const callsA: Array<number | string> = [];
        const callsB: Array<number | string> = [];

        const broadcastA = queue.broadcast(
            [1, 2],
            async chatId => {
                callsA.push(chatId);
                if (chatId === 1) {
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            },
            { broadcastId: 'job-a', concurrency: 1, delayMs: 0 }
        );

        const broadcastB = queue.broadcast(
            [10, 11],
            async chatId => {
                callsB.push(chatId);
                if (chatId === 10) {
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            },
            { broadcastId: 'job-b', concurrency: 1, delayMs: 0 }
        );

        await new Promise(resolve => setTimeout(resolve, 5));
        queue.stopBroadcast();

        await Promise.all([broadcastA, broadcastB]);

        expect(callsA).toEqual([1]);
        expect(callsB).toEqual([10]);
    });

    it('scheduleOnce re-armed from its own handler keeps the new job cancellable', async () => {
        const queue = new BotQueue(createMockClient());
        let firstRan = false;
        let secondRan = false;

        queue.scheduleOnce('job', 5, () => {
            firstRan = true;
            // Re-arm the same id with a long delay so it won't fire during the
            // test window — we only care that it stays tracked and cancellable.
            queue.scheduleOnce('job', 60_000, () => {
                secondRan = true;
            });
        });

        // Wait long enough for the first run to fire and re-schedule.
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(firstRan).toBe(true);

        // The re-armed job must still be tracked and cancellable.
        expect(queue.activeJobs).toBe(1);
        expect(queue.cancelScheduled('job')).toBe(true);
        expect(queue.activeJobs).toBe(0);
        expect(secondRan).toBe(false);
    });
});
