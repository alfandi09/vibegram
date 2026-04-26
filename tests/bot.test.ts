import { describe, it, expect, vi, afterEach } from 'vitest';
import { Bot } from '../src/bot';
import { UpdateTimeoutError } from '../src/errors';
import { makeCallbackQueryUpdate, makeMessageUpdate, makePhotoUpdate } from './helpers/mock';

describe('Bot', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('invalidates cached middleware when use() is called after the first update', async () => {
        const bot = new Bot('test-token');
        const calls: string[] = [];

        bot.use(async (_ctx, next) => {
            calls.push('first');
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('one'));

        bot.use(async (_ctx, next) => {
            calls.push('second');
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('two'));

        expect(calls).toEqual(['first', 'first', 'second']);
    });

    it('routes bot.on() message shortcuts and arrays', async () => {
        const bot = new Bot('test-token');
        const photoHandler = vi.fn(async (_ctx, next) => next());
        const mixedHandler = vi.fn();

        bot.on('photo', photoHandler);
        bot.on(['message', 'callback_query'], mixedHandler);

        await bot.handleUpdate(makePhotoUpdate());
        await bot.handleUpdate(makeCallbackQueryUpdate('pick'));

        expect(photoHandler).toHaveBeenCalledTimes(1);
        expect(mixedHandler).toHaveBeenCalledTimes(2);
    });

    it('invalidates cached middleware when bot.on() is registered after first update', async () => {
        const bot = new Bot('test-token');
        const handler = vi.fn();

        await bot.handleUpdate(makeMessageUpdate('before'));

        bot.on('message', handler);
        await bot.handleUpdate(makeMessageUpdate('after'));

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports start/help/settings shortcuts on Bot instances', async () => {
        const bot = new Bot('test-token');
        const startHandler = vi.fn();
        const helpHandler = vi.fn();
        const settingsHandler = vi.fn();

        bot.start(startHandler);
        bot.help(helpHandler);
        bot.settings(settingsHandler);

        await bot.handleUpdate(makeMessageUpdate('/start'));
        await bot.handleUpdate(makeMessageUpdate('/help'));
        await bot.handleUpdate(makeMessageUpdate('/settings'));

        expect(startHandler).toHaveBeenCalledTimes(1);
        expect(helpHandler).toHaveBeenCalledTimes(1);
        expect(settingsHandler).toHaveBeenCalledTimes(1);
    });

    it('emits update timeout errors through hooks and catch()', async () => {
        vi.useFakeTimers();
        try {
            const hooks = {
                onUpdateError: vi.fn(),
                onUpdateSuccess: vi.fn(),
            };
            const bot = new Bot('test-token', {
                updateTimeout: 10,
                observability: { hooks },
            });
            const catchHandler = vi.fn();

            bot.catch(catchHandler);
            bot.use(() => new Promise<void>(() => {}));

            const updatePromise = bot.handleUpdate(makeMessageUpdate('slow'));
            await vi.advanceTimersByTimeAsync(10);
            await updatePromise;

            expect(hooks.onUpdateSuccess).not.toHaveBeenCalled();
            expect(hooks.onUpdateError).toHaveBeenCalledTimes(1);
            expect(hooks.onUpdateError.mock.calls[0][0].error).toBeInstanceOf(UpdateTimeoutError);
            expect(catchHandler.mock.calls[0][0]).toBeInstanceOf(UpdateTimeoutError);
        } finally {
            vi.useRealTimers();
        }
    });

    it('validates updateTimeout values', () => {
        expect(() => new Bot('test-token', { updateTimeout: Number.POSITIVE_INFINITY })).toThrow(
            'updateTimeout'
        );
        expect(() => new Bot('test-token', { updateTimeout: -1 })).toThrow('updateTimeout');
    });

    it('returns 400 once for invalid webhook payloads', async () => {
        const bot = new Bot('test-token');
        const handler = bot.webhookCallback();
        const res = { statusCode: 0, end: vi.fn() };

        await handler({ method: 'POST', headers: {}, body: { foo: 'bar' } }, res);

        expect(res.statusCode).toBe(400);
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledWith('Bad Request: Invalid update object.');
    });

    it('rejects webhook requests with an invalid secret token', async () => {
        const bot = new Bot('test-token');
        const handler = bot.webhookCallback('expected-secret');
        const handleUpdateSpy = vi.spyOn(bot, 'handleUpdate');
        const res = { statusCode: 0, end: vi.fn() };

        await handler(
            {
                method: 'POST',
                headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret' },
                body: makeMessageUpdate('hello'),
            },
            res
        );

        expect(res.statusCode).toBe(403);
        expect(res.end).toHaveBeenCalledWith('Forbidden');
        expect(handleUpdateSpy).not.toHaveBeenCalled();
    });

    it('returns 500 when webhook processing throws', async () => {
        const bot = new Bot('test-token');
        const handler = bot.webhookCallback();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        bot.use(async () => {
            throw new Error('boom');
        });

        const res = { statusCode: 0, end: vi.fn() };
        await handler({ method: 'POST', headers: {}, body: makeMessageUpdate('hello') }, res);

        expect(res.statusCode).toBe(500);
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(res.end).toHaveBeenCalledWith('Internal Server Error');
        expect(errorSpy).toHaveBeenCalled();
    });

    it('does not process updates returned after stop() is requested', async () => {
        const bot = new Bot('test-token', { polling: { interval: 0 } });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(bot as any, '_registerSignals').mockImplementation(() => {});

        let resolveUpdates!: (updates: any[]) => void;
        const updatesPromise = new Promise<any[]>(resolve => {
            resolveUpdates = resolve;
        });

        const callApi = vi.fn((method: string) => {
            if (method === 'getMe') {
                return Promise.resolve({ id: 1, is_bot: true, first_name: 'Bot', username: 'bot' });
            }
            if (method === 'getUpdates') {
                return updatesPromise;
            }
            return Promise.resolve(undefined);
        });

        bot.client.callApi = callApi as any;

        const handleUpdateSpy = vi.spyOn(bot, 'handleUpdate');

        await bot.launch();
        const stopPromise = bot.stop('test');

        resolveUpdates([makeMessageUpdate('late update')]);
        await stopPromise;

        expect(handleUpdateSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith('[VibeGram] Bot stopped gracefully.');
    });

    it('emits update lifecycle hooks for success and failure paths', async () => {
        const hooks = {
            onUpdateStart: vi.fn(),
            onUpdateSuccess: vi.fn(),
            onUpdateError: vi.fn(),
            onWebhookError: vi.fn(),
        };
        const bot = new Bot('test-token', { observability: { hooks } });

        await bot.handleUpdate(makeMessageUpdate('hello'));

        expect(hooks.onUpdateStart).toHaveBeenCalledTimes(1);
        expect(hooks.onUpdateSuccess).toHaveBeenCalledTimes(1);
        expect(hooks.onUpdateError).not.toHaveBeenCalled();

        bot.use(async () => {
            throw new Error('boom');
        });

        const handler = bot.webhookCallback();
        const res = { statusCode: 0, end: vi.fn() };
        await handler({ method: 'POST', headers: {}, body: makeMessageUpdate('hello') }, res);

        expect(hooks.onUpdateError).toHaveBeenCalledTimes(1);
        expect(hooks.onWebhookError).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(500);
    });

    it('emits launch and stop hooks', async () => {
        const hooks = {
            onLaunch: vi.fn(),
            onStop: vi.fn(),
        };
        const bot = new Bot('test-token', { polling: { interval: 0 }, observability: { hooks } });
        vi.spyOn(bot as any, '_registerSignals').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        let stopRequested = false;
        bot.client.callApi = vi.fn(async (method: string) => {
            if (method === 'getMe') {
                return { id: 1, is_bot: true, first_name: 'Bot', username: 'bot' };
            }
            if (method === 'getUpdates') {
                if (stopRequested) {
                    return [];
                }
                stopRequested = true;
                return [];
            }
            return undefined;
        }) as any;

        await bot.launch();
        await bot.stop('test-stop');

        expect(hooks.onLaunch).toHaveBeenCalledTimes(1);
        expect(hooks.onStop).toHaveBeenCalledWith({ reason: 'test-stop' });
        expect(logSpy).toHaveBeenCalledWith('[VibeGram] Bot stopped gracefully.');
    });

    it('exposes direct Bot API management wrappers', async () => {
        const bot = new Bot('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue(true) as any;

        await bot.setMyName('VibeGram');
        await bot.getMyCommands({ language_code: 'en' });
        await bot.createInvoiceLink('Title', 'Description', 'payload', 'XTR', [
            { label: 'Stars', amount: 100 },
        ]);

        expect(bot.client.callApi).toHaveBeenNthCalledWith(1, 'setMyName', {
            name: 'VibeGram',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(2, 'getMyCommands', {
            language_code: 'en',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(
            3,
            'createInvoiceLink',
            expect.objectContaining({
                title: 'Title',
                currency: 'XTR',
                prices: [{ label: 'Stars', amount: 100 }],
            })
        );
    });

    it('exposes business account wrappers with official payload keys', async () => {
        const bot = new Bot('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue(true) as any;

        await bot.getBusinessConnection('bc-1');
        await bot.readBusinessMessage('bc-1', 99, 100);
        await bot.deleteBusinessMessages('bc-1', [100, 101]);
        await bot.setBusinessAccountName('bc-1', 'Acme', { last_name: 'Support' });
        await bot.setBusinessAccountUsername('bc-1', 'acme_support');
        await bot.setBusinessAccountBio('bc-1', 'We help quickly.');
        await bot.setBusinessAccountProfilePhoto('bc-1', { type: 'static', photo: 'attach://p' });
        await bot.removeBusinessAccountProfilePhoto('bc-1', { is_public: true });
        await bot.setBusinessAccountGiftSettings('bc-1', true, {
            unlimited_gifts: true,
            limited_gifts: true,
            unique_gifts: true,
            premium_subscription: true,
            gifts_from_channels: false,
        });

        expect(bot.client.callApi).toHaveBeenNthCalledWith(1, 'getBusinessConnection', {
            business_connection_id: 'bc-1',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(2, 'readBusinessMessage', {
            business_connection_id: 'bc-1',
            chat_id: 99,
            message_id: 100,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(3, 'deleteBusinessMessages', {
            business_connection_id: 'bc-1',
            message_ids: [100, 101],
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(4, 'setBusinessAccountName', {
            business_connection_id: 'bc-1',
            first_name: 'Acme',
            last_name: 'Support',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(5, 'setBusinessAccountUsername', {
            business_connection_id: 'bc-1',
            username: 'acme_support',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(6, 'setBusinessAccountBio', {
            business_connection_id: 'bc-1',
            bio: 'We help quickly.',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(7, 'setBusinessAccountProfilePhoto', {
            business_connection_id: 'bc-1',
            photo: { type: 'static', photo: 'attach://p' },
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(8, 'removeBusinessAccountProfilePhoto', {
            business_connection_id: 'bc-1',
            is_public: true,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(9, 'setBusinessAccountGiftSettings', {
            business_connection_id: 'bc-1',
            show_gift_button: true,
            accepted_gift_types: {
                unlimited_gifts: true,
                limited_gifts: true,
                unique_gifts: true,
                premium_subscription: true,
                gifts_from_channels: false,
            },
        });
    });

    it('exposes gift and story wrappers with official payload keys', async () => {
        const bot = new Bot('test-token');
        bot.client.callApi = vi.fn().mockResolvedValue(true) as any;

        await bot.getAvailableGifts();
        await bot.sendGift(42, 'gift-1', { text: 'Thanks' });
        await bot.sendGiftToChat('@channel', 'gift-2', { pay_for_upgrade: true });
        await bot.giftPremiumSubscription(42, 3, 1000, { text: 'Premium' });
        await bot.getUserGifts(42, { limit: 10 });
        await bot.getChatGifts('@channel', { exclude_saved: true });
        await bot.getBusinessAccountGifts('bc-1', { sort_by_price: true });
        await bot.upgradeGift('bc-1', 'owned-1', { keep_original_details: true, star_count: 0 });
        await bot.transferGift('bc-1', 'owned-2', 42, { star_count: 25 });
        await bot.postStory('bc-1', { type: 'photo', photo: 'attach://story' }, 21600, {
            caption: 'Launch',
        });
        await bot.repostStory('bc-1', 99, 7, 43200, { protect_content: true });
        await bot.editStory('bc-1', 7, { type: 'video', video: 'attach://video' });
        await bot.deleteStory('bc-1', 7);

        expect(bot.client.callApi).toHaveBeenNthCalledWith(1, 'getAvailableGifts');
        expect(bot.client.callApi).toHaveBeenNthCalledWith(2, 'sendGift', {
            user_id: 42,
            gift_id: 'gift-1',
            text: 'Thanks',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(3, 'sendGift', {
            chat_id: '@channel',
            gift_id: 'gift-2',
            pay_for_upgrade: true,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(4, 'giftPremiumSubscription', {
            user_id: 42,
            month_count: 3,
            star_count: 1000,
            text: 'Premium',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(5, 'getUserGifts', {
            user_id: 42,
            limit: 10,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(6, 'getChatGifts', {
            chat_id: '@channel',
            exclude_saved: true,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(7, 'getBusinessAccountGifts', {
            business_connection_id: 'bc-1',
            sort_by_price: true,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(8, 'upgradeGift', {
            business_connection_id: 'bc-1',
            owned_gift_id: 'owned-1',
            keep_original_details: true,
            star_count: 0,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(9, 'transferGift', {
            business_connection_id: 'bc-1',
            owned_gift_id: 'owned-2',
            new_owner_chat_id: 42,
            star_count: 25,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(10, 'postStory', {
            business_connection_id: 'bc-1',
            content: { type: 'photo', photo: 'attach://story' },
            active_period: 21600,
            caption: 'Launch',
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(11, 'repostStory', {
            business_connection_id: 'bc-1',
            from_chat_id: 99,
            from_story_id: 7,
            active_period: 43200,
            protect_content: true,
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(12, 'editStory', {
            business_connection_id: 'bc-1',
            story_id: 7,
            content: { type: 'video', video: 'attach://video' },
        });
        expect(bot.client.callApi).toHaveBeenNthCalledWith(13, 'deleteStory', {
            business_connection_id: 'bc-1',
            story_id: 7,
        });
    });
});
