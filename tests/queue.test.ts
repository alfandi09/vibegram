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
});
