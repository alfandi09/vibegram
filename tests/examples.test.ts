import { describe, expect, it, vi, afterEach } from 'vitest';
import { createBasicExample } from '../examples/basic';
import { createConversationExample } from '../examples/conversation';
import { createMenuExample } from '../examples/menu';
import { createQueueExample } from '../examples/queue';
import { createWebhookExample } from '../examples/webhook';
import { makeCallbackQueryUpdate, makeCommandUpdate } from './helpers/mock';

describe('examples smoke tests', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('basic example handles start command and callback flow without launching', async () => {
        const bot = createBasicExample('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue({}) as any;

        await bot.handleUpdate(makeCommandUpdate('start'));
        await bot.handleUpdate(makeCallbackQueryUpdate('send_pic'));

        expect(bot.client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'Welcome! Choose an option below:',
            })
        );
        expect(bot.client.callApi).toHaveBeenCalledWith('answerCallbackQuery', expect.any(Object));
        expect(bot.client.callApi).toHaveBeenCalledWith(
            'sendPhoto',
            expect.objectContaining({
                caption: 'Demo image from Picsum.',
            })
        );
    });

    it('conversation example responds to command entrypoints', async () => {
        const orderExample = createConversationExample('test-token');
        orderExample.bot.client.callApi = vi.fn().mockResolvedValue({}) as any;

        await orderExample.bot.handleUpdate(makeCommandUpdate('order'));

        expect(orderExample.bot.client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'What product would you like to order?',
            })
        );

        const feedbackExample = createConversationExample('test-token');
        feedbackExample.bot.client.callApi = vi.fn().mockResolvedValue({}) as any;

        await feedbackExample.bot.handleUpdate(makeCommandUpdate('feedback'));

        expect(feedbackExample.bot.client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'Please share your feedback (you have 60 seconds):',
            })
        );
    });

    it('menu example renders the top-level menu from command', async () => {
        const { bot } = createMenuExample('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue({}) as any;

        await bot.handleUpdate(makeCommandUpdate('menu'));

        expect(bot.client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: '📋 Main Menu:',
            })
        );
    });

    it('queue example can invoke broadcast and scheduled job commands with mocked queue methods', async () => {
        const { bot, queue } = createQueueExample('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue({}) as any;

        const broadcastSpy = vi.spyOn(queue, 'broadcastMessage').mockResolvedValue({
            total: 3,
            success: 3,
            failed: 0,
            errors: [],
            durationMs: 123,
        });

        await bot.handleUpdate(makeCommandUpdate('broadcast'));
        expect(broadcastSpy).toHaveBeenCalledTimes(1);

        await bot.handleUpdate(makeCommandUpdate('schedule'));
        expect(queue.activeJobs).toBe(1);

        await bot.handleUpdate(makeCommandUpdate('cancel_schedule'));
        expect(queue.activeJobs).toBe(0);
    });

    it('webhook example configures an express-style app lazily', () => {
        const use = vi.fn();
        const post = vi.fn();
        const json = vi.fn(() => 'json-middleware');
        const expressFactory = Object.assign(
            vi.fn(() => ({ use, post })),
            { json }
        );

        const example = createWebhookExample('test-token', 'secret');
        const app = example.createApp(expressFactory);

        expect(expressFactory).toHaveBeenCalledTimes(1);
        expect(json).toHaveBeenCalledTimes(1);
        expect(use).toHaveBeenCalledWith('json-middleware');
        expect(post).toHaveBeenCalledWith('/telegram-webhook', expect.any(Function));
        expect(app).toEqual({ use, post });
    });
});
