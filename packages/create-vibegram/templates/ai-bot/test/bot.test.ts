import { describe, expect, it } from 'vitest';
import { createTestBot } from 'vibegram/testing';
import { createBot } from '../src/bot.js';

async function* fakeModel(): AsyncGenerator<string> {
    yield 'Hello ';
    yield 'world';
}

describe('bot', () => {
    it('streams the model output into drafts and a final message', async () => {
        const t = createTestBot(createBot('test-token', fakeModel));
        await t.sendText('hi');
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(t.callsOf('sendMessageDraft').length).toBeGreaterThan(0);
        expect(t.lastCall('sendMessage')?.payload.text).toBe('Hello world');
    });
});
