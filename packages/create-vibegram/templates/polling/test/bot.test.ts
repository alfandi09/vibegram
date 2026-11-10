import { describe, expect, it } from 'vitest';
import { createTestBot } from 'vibegram/testing';
import { createBot } from '../src/bot.js';

describe('bot', () => {
    it('greets on /start', async () => {
        const t = createTestBot(createBot('test-token'));
        await t.sendCommand('start');
        expect(t.lastCall('sendMessage')?.payload.text).toMatch(/^Hi Test!/);
    });

    it('echoes text', async () => {
        const t = createTestBot(createBot('test-token'));
        await t.sendText('hello');
        expect(t.lastCall('sendMessage')?.payload.text).toBe('You said: hello');
    });

    it('counts button presses in the session', async () => {
        const t = createTestBot(createBot('test-token'));
        await t.pressButton('count');
        await t.pressButton('count');
        expect(t.lastCall('answerCallbackQuery')?.payload.text).toBe('Pressed 2 time(s)');
    });
});
