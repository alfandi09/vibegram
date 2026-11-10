import { describe, expect, it } from 'vitest';
import { Bot } from '../src/bot';
import { Markup } from '../src/markup';
import { createTestBot } from '../src/testing';

describe('vibegram/testing', () => {
    it('records outgoing calls and generates message results', async () => {
        const bot = new Bot('123:abc');
        const results: unknown[] = [];
        bot.command('start', async ctx => {
            results.push(
                await ctx.reply('Welcome!', {
                    reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Go', 'go')]]),
                })
            );
        });
        const t = createTestBot(bot);

        await t.sendCommand('start');

        const call = t.lastCall('sendMessage');
        expect(call?.payload).toMatchObject({ chat_id: 1001, text: 'Welcome!' });
        expect(call?.payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('go');
        expect(results[0]).toMatchObject({
            text: 'Welcome!',
            chat: { id: 1001 },
            from: { is_bot: true },
        });
    });

    it('passes command arguments and builds callback queries', async () => {
        const bot = new Bot('123:abc');
        const seen: string[] = [];
        bot.command('ref', ctx => void seen.push(ctx.command!.args.join(',')));
        bot.action(/^buy:(\d+)$/, async ctx => {
            seen.push(`buy ${ctx.match![1]}`);
            await ctx.answerCbQuery('Added');
        });
        const t = createTestBot(bot);

        await t.sendCommand('ref', 'abc 42');
        await t.pressButton('buy:7');

        expect(seen).toEqual(['abc,42', 'buy 7']);
        expect(t.lastCall('answerCallbackQuery')?.payload).toMatchObject({ text: 'Added' });
    });

    it('supports stubs, custom users/chats, raw updates, and clearing', async () => {
        const bot = new Bot('123:abc');
        bot.on('message:text', async ctx => {
            const member = await ctx.client.callApi('getChatMember', {
                chat_id: ctx.chat.id,
                user_id: ctx.from!.id,
            });
            await ctx.reply(`${ctx.chat.type}:${member.status}`);
        });
        const t = createTestBot(bot, { user: { id: 5, first_name: 'Eve' } }).stub('getChatMember', {
            status: 'administrator',
        });

        await t.sendText('hi', { chat: { id: -100, type: 'supergroup', title: 'G' } });
        expect(t.lastCall('sendMessage')?.payload).toMatchObject({
            chat_id: -100,
            text: 'supergroup:administrator',
        });

        t.clearCalls();
        expect(t.calls).toHaveLength(0);

        const update = await t.sendUpdate({
            message: {
                message_id: 1,
                date: 1,
                chat: { id: 5, type: 'private' },
                from: { id: 5, is_bot: false, first_name: 'Eve' },
                text: 'raw',
            },
        });
        expect(update.update_id).toBeGreaterThan(0);
        expect(t.callsOf('sendMessage')).toHaveLength(1);
    });

    it('stub functions receive the call and may throw', async () => {
        const bot = new Bot('123:abc');
        const errors: string[] = [];
        bot.on(':text', ctx => ctx.reply('x'));
        bot.catch(err => void errors.push((err as Error).message));
        const t = createTestBot(bot).stub('sendMessage', () => {
            throw new Error('blocked by user');
        });

        await t.sendText('hello');
        expect(errors).toEqual(['blocked by user']);
    });

    it('never contacts Telegram', async () => {
        const bot = new Bot('123:abc');
        const realFetch = globalThis.fetch;
        let fetched = false;
        globalThis.fetch = (async () => {
            fetched = true;
            throw new Error('network used');
        }) as typeof fetch;
        try {
            bot.on(':text', ctx => ctx.reply('pong'));
            const t = createTestBot(bot);
            await t.sendText('ping');
            await bot.getMe();
            expect(t.callsOf('getMe')).toHaveLength(1);
            expect(fetched).toBe(false);
        } finally {
            globalThis.fetch = realFetch;
        }
    });
});

describe('commandsOnEditedMessages', () => {
    it('runs commands for edited messages by default (backward compatible)', async () => {
        const bot = new Bot('123:abc');
        let runs = 0;
        bot.command('start', () => void runs++);
        const t = createTestBot(bot);

        await t.sendCommand('start');
        await t.sendCommand('start', undefined, { updateType: 'edited_message' });
        expect(runs).toBe(2);
    });

    it('ignores edited command messages when disabled', async () => {
        const bot = new Bot('123:abc', { commandsOnEditedMessages: false });
        let runs = 0;
        bot.command('start', () => void runs++);
        const t = createTestBot(bot);

        await t.sendCommand('start');
        await t.sendCommand('start', undefined, { updateType: 'edited_message' });
        await t.sendCommand('start', undefined, { updateType: 'edited_channel_post' });
        await t.sendCommand('start', undefined, { updateType: 'channel_post' });
        expect(runs).toBe(2);
    });
});
