import { describe, expect, it, vi } from 'vitest';
import { Bot } from '../src/bot';
import {
    ConversationReplayError,
    DurableConversation,
    MemoryConversationStore,
    type DurableConversationHandler,
} from '../src/durable-conversation';
import { TelegramApiError } from '../src/errors';
import { createTestBot } from '../src/testing';

function setup(
    handler: DurableConversationHandler,
    store = new MemoryConversationStore(),
    options: { timeout?: number } = {}
) {
    const bot = new Bot('123:abc');
    const conversations = new DurableConversation({ store, ...options });
    conversations.define('signup', handler);
    bot.use(conversations.middleware());
    bot.command('signup', ctx => conversations.enter('signup', ctx));
    const fallthrough = vi.fn();
    bot.on(':text', ctx => fallthrough(ctx.message.text));
    const t = createTestBot(bot);
    return { bot, conversations, store, t, fallthrough };
}

const replies = (t: ReturnType<typeof createTestBot>) =>
    t.callsOf('sendMessage').map(call => call.payload.text);

const signup: DurableConversationHandler = async (ctx, conv) => {
    await ctx.reply('Name?');
    const name = await conv.waitForText();
    await ctx.reply('Age?');
    const age = await conv.waitForText({
        validate: c => /^\d+$/.test(c.message?.text ?? ''),
        validationError: 'Numbers only.',
    });
    await ctx.reply(`Done: ${name}, ${age}`);
};

describe('DurableConversation', () => {
    it('runs a multi-step flow without re-sending replayed messages', async () => {
        const { t, store, fallthrough } = setup(signup);

        await t.sendCommand('signup');
        expect(store.size).toBe(1);
        await t.sendText('Alice');
        await t.sendText('abc');
        await t.sendText('30');

        expect(replies(t)).toEqual(['Name?', 'Age?', 'Numbers only.', 'Done: Alice, 30']);
        expect(store.size).toBe(0);
        expect(fallthrough).not.toHaveBeenCalled();
    });

    it('resumes after a restart from the stored record', async () => {
        const store = new MemoryConversationStore();
        const first = setup(signup, store);
        await first.t.sendCommand('signup');
        await first.t.sendText('Bob');

        // Simulate a new process: new bot, new conversation manager, same store.
        const second = setup(signup, store);
        await second.t.sendText('41');

        expect(replies(first.t)).toEqual(['Name?', 'Age?']);
        expect(replies(second.t)).toEqual(['Done: Bob, 41']);
        expect(store.size).toBe(0);
    });

    it('runs conv.external() once and replays its result', async () => {
        const sideEffect = vi.fn(() => 'order-1');
        const { t } = setup(async (ctx, conv) => {
            const id = await conv.external(sideEffect);
            await ctx.reply(`Created ${id}. Confirm?`);
            await conv.waitForText();
            await conv.waitForText();
            await ctx.reply(`Confirmed ${id}`);
        });

        await t.sendCommand('signup');
        await t.sendText('yes');
        await t.sendText('really');

        expect(sideEffect).toHaveBeenCalledTimes(1);
        expect(replies(t)).toEqual(['Created order-1. Confirm?', 'Confirmed order-1']);
    });

    it('records API errors and rethrows them consistently on replay', async () => {
        const { t } = setup(async (ctx, conv) => {
            try {
                await ctx.reply('first');
            } catch (error) {
                await ctx.reply(`caught ${(error as TelegramApiError).errorCode ?? 'unknown'}`);
            }
            await conv.waitForText();
            await ctx.reply('end');
        });

        let failNext = true;
        t.stub('sendMessage', (call: { payload: { text: string } }) => {
            if (call.payload.text === 'first' && failNext) {
                failNext = false;
                throw new TelegramApiError('Bad Request', 400, 'Bad Request');
            }
            return { message_id: 1, date: 1, chat: { id: 1, type: 'private' } };
        });

        await t.sendCommand('signup');
        await t.sendText('go');

        expect(replies(t)).toEqual(['first', 'caught 400', 'end']);
    });

    it('detects non-deterministic handlers', async () => {
        let run = 0;
        const { t, store } = setup(async (ctx, conv) => {
            run++;
            if (run === 1) await ctx.reply('a');
            else await conv.external(() => 'b');
            await conv.waitForText();
        });

        await t.sendCommand('signup');
        await expect(t.sendText('x')).rejects.toBeInstanceOf(ConversationReplayError);
        expect(store.size).toBe(0);
    });

    it('drops expired conversations and passes updates through', async () => {
        vi.useFakeTimers();
        try {
            const { t, fallthrough } = setup(signup, undefined, { timeout: 1000 });
            await t.sendCommand('signup');
            vi.advanceTimersByTime(1500);
            await t.sendText('late');
            expect(fallthrough).toHaveBeenCalledWith('late');
        } finally {
            vi.useRealTimers();
        }
    });

    it('leave() cancels and isActive() reflects state', async () => {
        const { t, conversations, store, fallthrough, bot } = setup(signup);

        await t.sendCommand('signup');
        await t.sendText('Carol');
        expect(store.size).toBe(1);

        // The active conversation consumes every update (like Conversation), so
        // leave from outside, e.g. an admin action or a timeout job.
        const { Context } = await import('../src/context');
        const keyCtx = new Context(
            {
                update_id: 999,
                message: {
                    message_id: 1,
                    date: 1,
                    chat: { id: 1001, type: 'private' },
                    from: { id: 1001, is_bot: false, first_name: 'Test' },
                },
            },
            bot.client
        );
        expect(await conversations.isActive(keyCtx)).toBe(true);
        await conversations.leave(keyCtx);
        expect(await conversations.isActive(keyCtx)).toBe(false);

        await t.sendText('after');
        expect(fallthrough).toHaveBeenCalledWith('after');
    });

    it('serializes concurrent updates for the same user', async () => {
        const { t } = setup(async (ctx, conv) => {
            const a = await conv.waitForText();
            const b = await conv.waitForText();
            await ctx.reply(`${a}+${b}`);
        });

        await t.sendCommand('signup');
        await Promise.all([t.sendText('one'), t.sendText('two')]);
        expect(replies(t)).toEqual(['one+two']);
    });

    it('MemoryConversationStore round-trips through JSON', () => {
        const store = new MemoryConversationStore();
        const record = { name: 'x', updates: [], entries: [], startedAt: 1, expiresAt: 2 };
        store.set('k', record);
        const loaded = store.get('k');
        expect(loaded).toEqual(record);
        expect(loaded).not.toBe(record);
    });

    it('rejects unknown conversations and invalid timeouts', async () => {
        expect(() => new DurableConversation({ timeout: 0 })).toThrow(TypeError);
        const bot = new Bot('123:abc');
        const conversations = new DurableConversation();
        bot.command('go', ctx => conversations.enter('missing', ctx));
        const t = createTestBot(bot);
        await expect(t.sendCommand('go')).rejects.toThrow(/not defined/);
    });
});
