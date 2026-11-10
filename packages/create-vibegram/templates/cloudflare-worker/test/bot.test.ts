import { describe, expect, it } from 'vitest';
import { createTestBot } from 'vibegram/testing';
import { createBot } from '../src/bot';

describe('bot', () => {
    it('greets on /start', async () => {
        const t = createTestBot(createBot('test-token'));
        await t.sendCommand('start');
        expect(t.lastCall('sendMessage')?.payload.text).toBe('Hello from Cloudflare Workers!');
    });
});
